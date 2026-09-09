const CACHE_NAME = "totalk-cache-v1";

/*
=========================================================
ToTalk Service Worker
Web Push Notifications
=========================================================
*/

/*
  Install
*/
self.addEventListener("install", event => {
  console.log("ToTalk Service Worker: installed");

  self.skipWaiting();
});


/*
  Activate
*/
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
        title: "ToTalk",
        body: "New message",
        conversation_id: null
      };

      /*
        Read push payload safely
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

            /*
              Only consider our ToTalk pages.
            */
            const isToTalk =
              url.origin === self.location.origin;

            return (
              isToTalk &&
              client.visibilityState === "visible"
            );

          } catch (error) {

            return false;

          }

        });


      /*
        If ToTalk is currently visible,
        do NOT show a system notification.
      */
      if (visibleToTalkWindow) {

        console.log(
          "ToTalk is visible. Notification suppressed."
        );

        return;

      }


      /*
      =====================================================
      SHOW NOTIFICATION
      =====================================================
      */

      const title =
        data.title || "ToTalk";

      const body =
        data.body || "New message";


      await self.registration.showNotification(
        title,
        {
          body: body,

          icon:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23914cff'/%3E%3Ctext x='50' y='64' font-size='52' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",

          badge:
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23914cff'/%3E%3Ctext x='50' y='64' font-size='52' text-anchor='middle' fill='white'%3ET%3C/text%3E%3C/svg%3E",

          tag:
            data.conversation_id
              ? "totalk-" + data.conversation_id
              : "totalk-message",

          renotify: true,

          data: {
            conversation_id:
              data.conversation_id || null
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
          event.notification?.data?.conversation_id || null;


        const windowClients =
          await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });


        /*
          Prefer an already-open ToTalk window.
        */
        for (const client of windowClients) {

          try {

            const url =
              new URL(client.url);

            if (url.origin !== self.location.origin) {
              continue;
            }

            /*
              Focus the existing ToTalk window.
            */
            await client.focus();

            /*
              Tell chat.html which conversation
              was opened from the notification.
            */
            if (
              conversationId &&
              "postMessage" in client
            ) {

              client.postMessage({
                type: "TOTalk_NOTIFICATION_CLICK",
                conversation_id: conversationId
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
          No ToTalk window is open.
          Open chat.html.
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
