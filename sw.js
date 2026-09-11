const CACHE_NAME = "totalk-cache-v1";

/*
=========================================================
ToTalk Service Worker
Web Push Notifications
=========================================================
*/

self.addEventListener("install", event => {
  console.log("ToTalk Service Worker: installed");
  self.skipWaiting();
});


self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      console.log("ToTalk Service Worker: activated");
    })()
  );
});


/*
=========================================================
PUSH RECEIVED
=========================================================
*/

self.addEventListener("push", event => {

  event.waitUntil(
    (async () => {

      /*
      -----------------------------------------------------
      DEFAULT PUSH DATA
      -----------------------------------------------------
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

          const incoming = event.data.json();

          if (incoming && typeof incoming === "object") {

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
      DELETE NOTIFICATION COMMAND
      =====================================================

      When a message is deleted, chat.html sends a special
      delete_notification push command.

      The service worker finds the matching notification
      using message_id first and conversation_id as fallback.
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
        ===================================================
        FIND EXISTING TOTalk NOTIFICATIONS
        ===================================================
        */

        const existingNotifications =
          await self.registration.getNotifications();


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
          -------------------------------------------------
          Match by message ID first.
          -------------------------------------------------
          */

          const messageMatches =
            messageId &&
            notificationMessageId &&
            messageId === notificationMessageId;


          /*
          -------------------------------------------------
          Match by conversation if message ID is not
          available.
          -------------------------------------------------
          */

          const conversationMatches =
            conversationId &&
            notificationConversationId &&
            conversationId ===
              notificationConversationId;


          if (
            messageMatches ||
            conversationMatches
          ) {

            notification.close();

            console.log(
              "ToTalk notification removed:",
              {
                message_id: messageId,
                conversation_id: conversationId
              }
            );

          }

        }


        return;

      }


      /*
      =====================================================
      CHECK WHETHER TOTalk IS CURRENTLY VISIBLE
      =====================================================
      */

      const windowClients =
        await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });


      const visibleToTalkWindow =
        windowClients.some(client => {

          try {

            const url =
              new URL(client.url);


            const isToTalk =
              url.origin ===
              self.location.origin;


            return (
              isToTalk &&
              client.visibilityState ===
                "visible"
            );

          } catch (error) {

            return false;

          }

        });


      /*
      -----------------------------------------------------
      If ToTalk is visible, suppress system notification.
      -----------------------------------------------------
      */

      if (visibleToTalkWindow) {

        console.log(
          "ToTalk is visible. Notification suppressed."
        );

        return;

      }


      /*
      =====================================================
      PREPARE NOTIFICATION CONTENT
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


      const notificationBody =
        data.body
          ? String(data.body)
          : "New message";


      /*
      =====================================================
      NOTIFICATION TAG / ANTI-SPAM BEHAVIOR
      =====================================================

      IMPORTANT:

      We do NOT create a completely separate Android
      notification for every message in the same chat.

      Instead, one notification slot is used per conversation.

      This greatly reduces notification flooding and makes
      the notification behavior more friendly to Chrome's
      notification protection system.
      */

      const notificationTag =
        data.conversation_id
          ? "totalk-conversation-" +
            String(data.conversation_id)
          : (
              data.message_id
                ? "totalk-message-" +
                  String(data.message_id)
                : "totalk-message"
            );


      /*
      =====================================================
      CONTROL RE-NOTIFICATION
      =====================================================

      If another message arrives very shortly after the
      previous notification for the same conversation,
      update the notification without repeatedly alerting
      the user.

      After 45 seconds, a normal notification alert is
      allowed again.
      */

      let shouldRenotify = true;


      try {

        const existing =
          await self.registration.getNotifications({
            tag: notificationTag
          });


        if (existing.length) {

          const newest =
            existing[existing.length - 1];


          const previousTime =
            Number(
              newest.timestamp || 0
            );


          const age =
            Date.now() - previousTime;


          /*
          -------------------------------------------------
          Within 45 seconds:
          update silently.

          After 45 seconds:
          allow a normal alert again.
          -------------------------------------------------
          */

          if (
            previousTime > 0 &&
            age < 45000
          ) {

            shouldRenotify = false;

          }


          /*
          -------------------------------------------------
          Close the old notification.

          The new notification will replace it with the
          latest message information.
          -------------------------------------------------
          */

          existing.forEach(
            notification => {

              try {

                notification.close();

              } catch (_) {}

            }
          );

        }

      } catch (error) {

        console.warn(
          "ToTalk notification history check failed:",
          error
        );

      }


      /*
      =====================================================
      TOTalk ICON
      =====================================================

      Cosmic ToTalk notification icon.
      */

      const totalkIcon =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='35%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23b875ff'/%3E%3Cstop offset='55%25' stop-color='%23914cff'/%3E%3Cstop offset='100%25' stop-color='%23510f9c'/%3E%3C/radialGradient%3E%3Cfilter id='s'%3E%3CfeGaussianBlur stdDeviation='4' result='b'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='96' cy='96' r='88' fill='%237d2cff' opacity='.35' filter='url(%23s)'/%3E%3Ccircle cx='96' cy='96' r='78' fill='url(%23g)'/%3E%3Ccircle cx='96' cy='96' r='68' fill='none' stroke='%23ffffff' stroke-opacity='.18' stroke-width='2'/%3E%3Ccircle cx='61' cy='57' r='5' fill='%23ffffff' opacity='.65'/%3E%3Ccircle cx='137' cy='68' r='3' fill='%23ffffff' opacity='.55'/%3E%3Ccircle cx='126' cy='132' r='4' fill='%23ffffff' opacity='.45'/%3E%3Ctext x='96' y='119' font-family='Arial,sans-serif' font-size='78' font-weight='700' text-anchor='middle' fill='%23ffffff'%3ET%3C/text%3E%3C/svg%3E";


      /*
      =====================================================
      NOTIFICATION OPTIONS
      =====================================================
      */

      const notificationOptions = {

        /*
        Message preview
        */

        body:
          notificationBody,


        /*
        ToTalk icon
        */

        icon:
          totalkIcon,


        /*
        Small notification badge
        */

        badge:
          totalkIcon,


        /*
        One notification slot per conversation
        */

        tag:
          notificationTag,


        /*
        Anti-spam notification behavior
        */

        renotify:
          shouldRenotify,


        /*
        ===================================================
        NOTIFICATION DATA
        ===================================================

        These values are required by:

        - Delete notification
        - Reply action
        - Mark as read action
        - Opening the correct conversation
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

        Android/Chrome controls the exact visual appearance
        of these buttons.

        Reply:
        Opens the exact sender conversation and prepares
        the reply.

        Mark as read:
        Marks that conversation as read.
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


        /*
        Notification language/direction
        */

        dir:
          "auto",

        lang:
          "en",


        /*
        Notification timestamp
        */

        timestamp:
          Date.now()

      };


      /*
      =====================================================
      SHOW NOTIFICATION
      =====================================================
      */

      await self.registration.showNotification(
        notificationTitle,
        notificationOptions
      );

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

    /*
    Close notification immediately.
    */

    event.notification.close();


    event.waitUntil(
      (async () => {

        /*
        ===================================================
        READ NOTIFICATION DATA
        ===================================================
        */

        const data =
          event.notification?.data || {};


        const action =
          event.action || "open";


        const conversationId =
          data.conversation_id
            ? String(data.conversation_id)
            : "";


        const messageId =
          data.message_id
            ? String(data.message_id)
            : "";


        const body =
          data.body
            ? String(data.body)
            : "";


        const senderName =
          data.sender_name
            ? String(data.sender_name)
            : "";


        /*
        ===================================================
        BUILD EXACT CHAT URL
        ===================================================

        These parameters allow chat.html to know exactly
        which conversation/message the notification belongs
        to.
        */

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


        if (body) {

          chatUrl.searchParams.set(
            "totalk_notification_body",
            body
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


        /*
        ===================================================
        FIND OPEN CHAT.HTML WINDOWS
        ===================================================
        */

        const clients =
          await self.clients.matchAll({
            type:
              "window",

            includeUncontrolled:
              true
          });


        const chatClients =
          clients.filter(client => {

            try {

              const url =
                new URL(client.url);


              return (
                url.origin ===
                  self.location.origin &&

                url.pathname.endsWith(
                  "/chat.html"
                )
              );

            } catch (_) {

              return false;

            }

          });


        /*
        ===================================================
        CHAT IS ALREADY OPEN
        ===================================================
        */

        if (chatClients.length) {

          const client =
            chatClients[0];


          /*
          Focus the existing ToTalk chat.
          */

          await client.focus();


          /*
          Send the action directly to chat.html.
          */

          client.postMessage({

            type:
              "TOTalk_NOTIFICATION_ACTION",

            action:
              action,

            conversation_id:
              conversationId || null,

            message_id:
              messageId || null,

            body:
              body || null,

            sender_name:
              senderName || null

          });


          return;

        }


        /*
        ===================================================
        CHAT IS NOT OPEN
        ===================================================

        Open chat.html with the exact notification action.
        */

        if (self.clients.openWindow) {

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
