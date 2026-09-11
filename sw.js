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

        /*
        Optional fields:
        sender_name
        sender_avatar
        conversation_id
        message_id
        sender_id
        */

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
      DELETE NOTIFICATION COMMAND
      =====================================================

      When a message is deleted, chat.html sends a special
      push command.

      We find the notification using message_id first.
      conversation_id is used as a fallback.
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
        FIND EXISTING NOTIFICATIONS
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
          Match exact message first.
          -------------------------------------------------
          */

          const messageMatches =
            messageId &&
            notificationMessageId &&
            messageId === notificationMessageId;


          /*
          -------------------------------------------------
          Conversation fallback.
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
      If ToTalk is already visible, don't show notification.
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

        /*
        Message preview
        */

        body: notificationBody,


        /*
        ToTalk icon
        */

        icon: totalkIcon,


        /*
        Notification badge
        */

        badge: totalkIcon,


        /*
        Unique notification tag
        */

        tag: notificationTag,


        /*
        Allow new messages to notify again.
        */

        renotify: true,


        /*
        ===================================================
        IMPORTANT NOTIFICATION DATA
        ===================================================

        These fields are required for:

        • Reply
        • Mark as read
        • Delete notification
        */

        data: {

          type: "message",

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
            action: "reply",
            title: "Reply"
          },

          {
            action: "mark_read",
            title: "Mark as read"
          }

        ],


        /*
        Direction / language
        */

        dir: "auto",

        lang: "en",


        /*
        Timestamp
        */

        timestamp: Date.now()

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
    Close the notification immediately.
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
        BUILD CHAT URL
        ===================================================

        We ALWAYS target chat.html.

        We do NOT target:

        index.html
        admin.html
        random same-origin pages
        */

        const chatUrl =
          new URL(
            "chat.html",
            self.registration.scope
          );


        /*
        Conversation
        */

        if (conversationId) {

          chatUrl.searchParams.set(
            "totalk_notification_conversation",
            conversationId
          );

        }


        /*
        Message
        */

        if (messageId) {

          chatUrl.searchParams.set(
            "totalk_notification_message",
            messageId
          );

        }


        /*
        Message body
        */

        if (body) {

          chatUrl.searchParams.set(
            "totalk_notification_body",
            body
          );

        }


        /*
        Sender name
        */

        if (senderName) {

          chatUrl.searchParams.set(
            "totalk_notification_sender",
            senderName
          );

        }


        /*
        Selected action
        */

        chatUrl.searchParams.set(
          "totalk_notification_action",
          action
        );


        /*
        ===================================================
        FIND OPEN ToTalk CHAT PAGE
        ===================================================
        */

        const clients =
          await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

          });


        const chatClients =
          clients.filter(client => {

            try {

              const url =
                new URL(client.url);


              /*
              IMPORTANT:

              Only use chat.html.

              Never use index.html or admin.html.
              */

              return (
                url.origin ===
                  self.location.origin &&

                url.pathname.endsWith(
                  "/chat.html"
                )
              );

            } catch (error) {

              return false;

            }

          });


        /*
        ===================================================
        CHAT ALREADY OPEN
        ===================================================
        */

        if (chatClients.length) {

          const client =
            chatClients[0];


          /*
          Focus the actual chat page.
          */

          await client.focus();


          /*
          Send notification action to chat.html.
          */

          if (
            "postMessage" in client
          ) {

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

          }


          return;

        }


        /*
        ===================================================
        CHAT IS NOT OPEN
        ===================================================

        Open the exact chat.html URL containing the
        notification action information.
        */

        if (
          self.clients.openWindow
        ) {

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
