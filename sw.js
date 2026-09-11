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

      let data = {
        type: "message",
        title: "ToTalk",
        body: "New message",
        conversation_id: null,
        message_id: null
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

      When a sent message is deleted, chat.html will send
      a special push command to the recipient's device.

      The Service Worker then finds the existing ToTalk
      notification and closes it.
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
      SHOW NORMAL MESSAGE NOTIFICATION
      =====================================================
      */

      const title =
        data.title || "ToTalk";


      const body =
        data.body || "New message";


      /*
      =====================================================
      NOTIFICATION TAG
      =====================================================

      Each message gets its own notification tag when a
      message_id is available.

      This lets us remove the exact notification later.
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
      SHOW NOTIFICATION
      =====================================================
      */

      await self.registration.showNotification(
        title,
        {

          body: body,

          /*
          -------------------------------------------------
          Current ToTalk icon.
          Keep this here until we connect the final
          uploaded ToTalk logo path.
          -------------------------------------------------
          */

          icon:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23914cff'/%3E%3Ctext x='50' y='64' font-size='52' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",


          badge:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23914cff'/%3E%3Ctext x='50' y='64' font-size='52' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",


          tag: notificationTag,


          /*
          -------------------------------------------------
          Allow a new message to update the notification.
          -------------------------------------------------
          */

          renotify: true,


          /*
          =================================================
          DATA KEPT INSIDE THE NOTIFICATION
          =================================================

          This is important because the delete command
          needs to know which notification belongs to
          which message.
          */

          data: {

            type: "message",

            conversation_id:
              data.conversation_id || null,

            message_id:
              data.message_id || null,

            sender_id:
              data.sender_id || null

          }

        }
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

        const conversationId =
          event.notification?.data
            ?.conversation_id || null;


        const windowClients =
          await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });


        /*
        ===================================================
        PREFER EXISTING TOTalk WINDOW
        ===================================================
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


            /*
            -----------------------------------------------
            Tell chat.html which conversation was opened.
            -----------------------------------------------
            */

            if (
              conversationId &&
              "postMessage" in client
            ) {

              client.postMessage({

                type:
                  "TOTalk_NOTIFICATION_CLICK",

                conversation_id:
                  conversationId

              });

            }


            return;

          } catch (error) {

            console.warn(
              "Could not focus ToTalk window:",
              error
            );

          }

        }


        /*
        ===================================================
        NO WINDOW OPEN
        ===================================================
        */

        if (self.clients.openWindow) {

          await self.clients.openWindow(
            "/chat.html"
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
