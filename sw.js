/*
=========================================================
ToTalk Service Worker
Web Push Notifications
Background + Closed Chrome Support
=========================================================
*/

const CACHE_NAME = "totalk-push-v2";


/*
=========================================================
INSTALL
=========================================================
*/

self.addEventListener("install", event => {
  console.log("ToTalk Service Worker: installed");

  event.waitUntil(
    (async () => {
      await self.skipWaiting();
    })()
  );
});


/*
=========================================================
ACTIVATE
=========================================================
*/

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      console.log(
        "ToTalk Service Worker: activated"
      );
    })()
  );
});


/*
=========================================================
PUSH RECEIVED
=========================================================
IMPORTANT:

This handler works even when:
- ToTalk is closed
- Chrome UI is not open
- The phone screen is locked

The phone itself cannot display a notification while it
is completely powered OFF. When the phone is ON, Web Push
can wake the Service Worker in the background.
=========================================================
*/

self.addEventListener("push", event => {

  event.waitUntil(

    (async () => {

      /*
      =====================================================
      DEFAULT DATA
      =====================================================
      */

      let data = {
        type: "message",

        title: "ToTalk",

        body: "New message",

        sender_name: null,

        sender_avatar: null,

        conversation_id: null,

        message_id: null,

        sender_id: null
      };


      /*
      =====================================================
      READ PUSH PAYLOAD
      =====================================================
      */

      try {

        if (event.data) {

          const incoming =
            event.data.json();

          if (
            incoming &&
            typeof incoming === "object"
          ) {

            data = {
              ...data,
              ...incoming
            };

          }

        }

      } catch (error) {

        console.warn(
          "ToTalk push payload could not be parsed:",
          error
        );

      }


      /*
      =====================================================
      DELETE NOTIFICATION
      =====================================================
      */

      if (
        data.type === "delete_notification" ||
        data.action === "delete_notification"
      ) {

        const conversationId =
          data.conversation_id
            ? String(data.conversation_id)
            : null;

        const messageId =
          data.message_id
            ? String(data.message_id)
            : null;


        /*
        -----------------------------------------------------
        Find existing notifications
        -----------------------------------------------------
        */

        let existingNotifications = [];

        try {

          existingNotifications =
            await self.registration.getNotifications();

        } catch (error) {

          console.warn(
            "ToTalk could not read notifications:",
            error
          );

        }


        /*
        -----------------------------------------------------
        Match and close notification
        -----------------------------------------------------
        */

        for (
          const notification
          of existingNotifications
        ) {

          const notificationData =
            notification?.data || {};


          const notificationConversationId =
            notificationData?.conversation_id
              ? String(
                  notificationData.conversation_id
                )
              : null;


          const notificationMessageId =
            notificationData?.message_id
              ? String(
                  notificationData.message_id
                )
              : null;


          /*
          Message ID is the strongest match.
          */

          const messageMatches =
            !!(
              messageId &&
              notificationMessageId &&
              messageId ===
                notificationMessageId
            );


          /*
          Conversation ID is the fallback.
          */

          const conversationMatches =
            !!(
              conversationId &&
              notificationConversationId &&
              conversationId ===
                notificationConversationId
            );


          if (
            messageMatches ||
            conversationMatches
          ) {

            try {

              notification.close();

              console.log(
                "ToTalk notification removed:",
                {
                  message_id:
                    messageId,

                  conversation_id:
                    conversationId
                }
              );

            } catch (error) {

              console.warn(
                "ToTalk notification close failed:",
                error
              );

            }

          }

        }


        return;
      }


      /*
      =====================================================
      NORMAL MESSAGE NOTIFICATION
      =====================================================
      */

      /*
      IMPORTANT:

      There is intentionally NO:

      "if ToTalk is visible, return"

      here.

      The Service Worker must be able to display the
      notification whenever the push server delivers it.

      This is what allows background notifications.
      */


      /*
      =====================================================
      NOTIFICATION TITLE
      =====================================================
      */

      const notificationTitle =
        data.sender_name
          ? String(data.sender_name)
          : (
              data.title
                ? String(data.title)
                : "ToTalk"
            );


      /*
      =====================================================
      NOTIFICATION BODY
      =====================================================
      */

      const notificationBody =
        data.body
          ? String(data.body)
          : "New message";


      /*
      =====================================================
      NOTIFICATION TAG
      =====================================================
      */

      let notificationTag;


      if (data.message_id) {

        notificationTag =
          "totalk-message-" +
          String(data.message_id);

      } else if (data.conversation_id) {

        notificationTag =
          "totalk-" +
          String(data.conversation_id);

      } else {

        notificationTag =
          "totalk-message";

      }


      /*
      =====================================================
      TOTalk ICON
      =====================================================
      */

      const totalkIcon =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='35%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23b875ff'/%3E%3Cstop offset='55%25' stop-color='%23914cff'/%3E%3Cstop offset='100%25' stop-color='%23510f9c'/%3E%3C/radialGradient%3E%3Cfilter id='s'%3E%3CfeGaussianBlur stdDeviation='4' result='b'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='96' cy='96' r='88' fill='%237d2cff' opacity='.35' filter='url(%23s)'/%3E%3Ccircle cx='96' cy='96' r='78' fill='url(%23g)'/%3E%3Ccircle cx='96' cy='96' r='68' fill='none' stroke='%23ffffff' stroke-opacity='.18' stroke-width='2'/%3E%3Ccircle cx='61' cy='57' r='5' fill='%23ffffff' opacity='.65'/%3E%3Ccircle cx='137' cy='68' r='3' fill='%23ffffff' opacity='.55'/%3E%3Ccircle cx='126' cy='132' r='4' fill='%23ffffff' opacity='.45'/%3E%3Ctext x='96' y='119' font-family='Arial,sans-serif' font-size='78' font-weight='700' text-anchor='middle' fill='%23ffffff'%3ET%3C/text%3E%3C/svg%3E";


      /*
      =====================================================
      NOTIFICATION OPTIONS
      =====================================================
      */

      const notificationOptions = {

        body:
          notificationBody,


        icon:
          totalkIcon,


        badge:
          totalkIcon,


        /*
        Each message has its own notification.
        */

        tag:
          notificationTag,


        /*
        Make every new message notify again.
        */

        renotify:
          true,


        /*
        Keep exact message information.

        The delete-notification system depends on this.
        */

        data: {

          type:
            "message",

          conversation_id:
            data.conversation_id || null,

          message_id:
            data.message_id || null,

          sender_id:
            data.sender_id || null,

          sender_name:
            data.sender_name || null,

          body:
            data.body || null
        },


        /*
        ===================================================
        NOTIFICATION ACTIONS
        ===================================================
        */

        actions: [

          {
            action:
              "reply",

            title:
              "Reply"
          },

          {
            action:
              "mark_read",

            title:
              "Mark as read"
          }

        ],


        dir:
          "auto",

        lang:
          "en",


        timestamp:
          Date.now()

      };


      /*
      =====================================================
      SHOW SYSTEM NOTIFICATION
      =====================================================
      */

      try {

        await self.registration.showNotification(
          notificationTitle,
          notificationOptions
        );

        console.log(
          "ToTalk background notification shown:",
          {
            title:
              notificationTitle,

            message_id:
              data.message_id,

            conversation_id:
              data.conversation_id
          }
        );

      } catch (error) {

        console.error(
          "ToTalk could not show notification:",
          error
        );

      }

    })()

  );

});


/*
=========================================================
NOTIFICATION CLICK
=========================================================
*/

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    event.waitUntil(

      (async () => {

        const notification =
          event.notification;


        const notificationData =
          notification?.data || {};


        const conversationId =
          notificationData?.conversation_id
            ? String(
                notificationData.conversation_id
              )
            : "";


        const messageId =
          notificationData?.message_id
            ? String(
                notificationData.message_id
              )
            : "";


        const messageBody =
          notificationData?.body
            ? String(
                notificationData.body
              )
            : "";


        const senderName =
          notificationData?.sender_name
            ? String(
                notificationData.sender_name
              )
            : "";


        const action =
          event.action || "open";


        /*
        ===================================================
        SEND ACTION TO CHAT.HTML
        ===================================================
        */

        const actionMessage = {

          type:
            "TOTalk_NOTIFICATION_ACTION",

          conversation_id:
            conversationId || null,

          message_id:
            messageId || null,

          body:
            messageBody || null,

          sender_name:
            senderName || null,

          action:
            action

        };


        /*
        ===================================================
        FIND OPEN TOTalk WINDOW
        ===================================================
        */

        const windowClients =
          await self.clients.matchAll({

            type:
              "window",

            includeUncontrolled:
              true

          });


        /*
        Use existing ToTalk window first.
        */

        for (
          const client
          of windowClients
        ) {

          try {

            const url =
              new URL(client.url);


            if (
              url.origin !==
              self.location.origin
            ) {
              continue;
            }


            await client.focus();


            if (
              "postMessage" in client
            ) {

              client.postMessage(
                actionMessage
              );

            }


            return;

          } catch (error) {

            console.warn(
              "ToTalk notification action could not reach window:",
              error
            );

          }

        }


        /*
        ===================================================
        NO WINDOW OPEN
        ===================================================
        */

        if (
          self.clients.openWindow
        ) {

          const chatUrl =
            new URL(
              "chat.html",
              self.registration.scope
            );


          if (conversationId) {

            chatUrl.searchParams.set(
              "totalk_notification_conversation",
              conversationId
            );

          }


          if (messageId) {

            chatUrl.searchParams.set(
              "totalk_notification_message",
              messageId
            );

          }


          if (messageBody) {

            chatUrl.searchParams.set(
              "totalk_notification_body",
              messageBody
            );

          }


          if (senderName) {

            chatUrl.searchParams.set(
              "totalk_notification_sender",
              senderName
            );

          }


          chatUrl.searchParams.set(
            "totalk_notification_action",
            action
          );


          await self.clients.openWindow(
            chatUrl.href
          );

        }

      })()

    );

  }
);


/*
=========================================================
NOTIFICATION CLOSE
=========================================================
*/

self.addEventListener(
  "notificationclose",
  event => {

    console.log(
      "ToTalk notification closed"
    );

  }
);
