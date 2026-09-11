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
        Optional fields supported by this service worker:
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

      IMPORTANT:
      This block is intentionally preserved.

      When a sent message is deleted, chat.html sends a
      special delete_notification push command.

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

      /*
      If sender_name exists, use the sender's name as the
      notification title.

      Otherwise fall back to the supplied title.
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
      Message preview.
      */

      const notificationBody =
        data.body
          ? String(data.body)
          : "New message";


      /*
      =====================================================
      NOTIFICATION TAG
      =====================================================

      Each message gets its own notification.

      This is IMPORTANT because the delete command later
      needs to identify the exact notification.
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

      This is a simple cosmic ToTalk icon.

      Later, if you have your final production ToTalk logo,
      replace this with the real icon URL.
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
        ---------------------------------------------------
        Message text
        ---------------------------------------------------
        */

        body: notificationBody,


        /*
        ---------------------------------------------------
        ToTalk icon
        ---------------------------------------------------
        */

        icon: totalkIcon,


        /*
        ---------------------------------------------------
        Small notification badge
        ---------------------------------------------------
        */

        badge: totalkIcon,


        /*
        ---------------------------------------------------
        Individual message tag
        ---------------------------------------------------
        */

        tag: notificationTag,


        /*
        ---------------------------------------------------
        Allow a new message to notify again.
        ---------------------------------------------------
        */

        renotify: true,


        /*
        ---------------------------------------------------
        Keep notification data.

        DO NOT REMOVE THESE FIELDS.

        The delete-notification system depends on them.
        ---------------------------------------------------
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

        Android/Chrome decides exactly how these buttons
        are visually rendered.

        We only define the available actions here.
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
        ---------------------------------------------------
        Direction / language
        ---------------------------------------------------
        */

        dir: "auto",
        lang: "en",


        /*
        ---------------------------------------------------
        Timestamp
        ---------------------------------------------------
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

    event.notification.close();

    event.waitUntil(
      (async () => {

        const notification = event.notification;
        const notificationData = notification?.data || {};

        const conversationId = notificationData?.conversation_id
          ? String(notificationData.conversation_id)
          : "";

        const messageId = notificationData?.message_id
          ? String(notificationData.message_id)
          : "";

        const messageBody = notificationData?.body
          ? String(notificationData.body)
          : "";

        const senderName = notificationData?.sender_name
          ? String(notificationData.sender_name)
          : "";

        const action = event.action || "open";

        /*
         * The service worker receives the Android notification action, then
         * hands it to chat.html. chat.html has the authenticated Supabase
         * session and performs the actual read/reply UI operation.
         */
        const actionMessage = {
          type: "TOTalk_NOTIFICATION_ACTION",
          conversation_id: conversationId || null,
          message_id: messageId || null,
          body: messageBody || null,
          sender_name: senderName || null,
          action
        };

        const windowClients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });

        /* Use an already-open ToTalk window when possible. */
        for (const client of windowClients) {
          try {
            const url = new URL(client.url);

            if (url.origin !== self.location.origin) continue;

            await client.focus();

            if ("postMessage" in client) {
              client.postMessage(actionMessage);
            }

            return;
          } catch (error) {
            console.warn(
              "ToTalk notification action could not reach window:",
              error
            );
          }
        }

        /* No window is open: open chat.html with the action in the URL. */
        if (self.clients.openWindow) {
          const chatUrl = new URL(
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

          await self.clients.openWindow(chatUrl.href);
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
