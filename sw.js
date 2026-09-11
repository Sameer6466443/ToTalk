const CACHE_NAME = "totalk-cache-v1";

/*
=========================================================
ToTalk Service Worker
Web Push Notifications
=========================================================
*/


/*
=========================================================
INSTALL
=========================================================
*/

self.addEventListener("install", event => {

  console.log(
    "ToTalk Service Worker: installed"
  );

  self.skipWaiting();

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
*/

self.addEventListener("push", event => {

  event.waitUntil(

    (async () => {

      /*
      ---------------------------------------------------
      Default notification data
      ---------------------------------------------------
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
      ===================================================
      READ PUSH PAYLOAD
      ===================================================
      */

      try {

        if(event.data){

          const incoming =
            event.data.json();

          if(
            incoming &&
            typeof incoming === "object"
          ){

            data = {
              ...data,
              ...incoming
            };

          }

        }

      }catch(error){

        console.warn(
          "ToTalk push payload could not be parsed:",
          error
        );

      }


      /*
      ===================================================
      DELETE NOTIFICATION
      ===================================================

      Used when the sender deletes a message.

      IMPORTANT:
      Keep this system working.
      ===================================================
      */

      if(
        data.type === "delete_notification" ||
        data.action === "delete_notification"
      ){

        const conversationId =
          data.conversation_id
            ? String(data.conversation_id)
            : null;

        const messageId =
          data.message_id
            ? String(data.message_id)
            : null;


        const existingNotifications =
          await self.registration.getNotifications();


        for(
          const notification
          of existingNotifications
        ){

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


          const messageMatches =
            !!(
              messageId &&
              notificationMessageId &&
              messageId === notificationMessageId
            );


          const conversationMatches =
            !!(
              conversationId &&
              notificationConversationId &&
              conversationId ===
                notificationConversationId
            );


          if(
            messageMatches ||
            conversationMatches
          ){

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
      ===================================================
      CHECK WHETHER ToTalk IS VISIBLE
      ===================================================
      */

      const windowClients =
        await self.clients.matchAll({

          type: "window",

          includeUncontrolled: true

        });


      const visibleToTalkWindow =
        windowClients.some(client => {

          try{

            const url =
              new URL(client.url);


            return (

              url.origin ===
                self.location.origin &&

              client.visibilityState ===
                "visible"

            );

          }catch(error){

            return false;

          }

        });


      /*
      ---------------------------------------------------
      If ToTalk is currently visible, don't create a
      duplicate system notification.
      ---------------------------------------------------
      */

      if(visibleToTalkWindow){

        console.log(
          "ToTalk is visible. Notification suppressed."
        );

        return;

      }


      /*
      ===================================================
      NOTIFICATION TITLE
      ===================================================
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
      ===================================================
      NOTIFICATION BODY
      ===================================================
      */

      const notificationBody =
        data.body
          ? String(data.body)
          : "New message";


      /*
      ===================================================
      NOTIFICATION TAG
      ===================================================
      */

      let notificationTag;


      if(data.message_id){

        notificationTag =
          "totalk-message-" +
          String(data.message_id);

      }else if(data.conversation_id){

        notificationTag =
          "totalk-conversation-" +
          String(data.conversation_id);

      }else{

        notificationTag =
          "totalk-message";

      }


      /*
      ===================================================
      ToTalk ICON
      ===================================================
      */

      const totalkIcon =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='35%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23b875ff'/%3E%3Cstop offset='55%25' stop-color='%23914cff'/%3E%3Cstop offset='100%25' stop-color='%23510f9c'/%3E%3C/radialGradient%3E%3Cfilter id='s'%3E%3CfeGaussianBlur stdDeviation='4' result='b'/%3E%3C/filter%3E%3C/defs%3E%3Ccircle cx='96' cy='96' r='88' fill='%237d2cff' opacity='.35' filter='url(%23s)'/%3E%3Ccircle cx='96' cy='96' r='78' fill='url(%23g)'/%3E%3Ccircle cx='96' cy='96' r='68' fill='none' stroke='%23ffffff' stroke-opacity='.18' stroke-width='2'/%3E%3Ccircle cx='61' cy='57' r='5' fill='%23ffffff' opacity='.65'/%3E%3Ccircle cx='137' cy='68' r='3' fill='%23ffffff' opacity='.55'/%3E%3Ccircle cx='126' cy='132' r='4' fill='%23ffffff' opacity='.45'/%3E%3Ctext x='96' y='119' font-family='Arial,sans-serif' font-size='78' font-weight='700' text-anchor='middle' fill='%23ffffff'%3ET%3C/text%3E%3C/svg%3E";


      /*
      ===================================================
      NOTIFICATION OPTIONS
      ===================================================
      */

      const notificationOptions = {

        body:
          notificationBody,


        icon:
          totalkIcon,


        badge:
          totalkIcon,


        tag:
          notificationTag,


        renotify:
          true,


        /*
        -------------------------------------------------
        IMPORTANT

        ALL notification information is stored here.

        Reply and Mark as read depend on this.
        -------------------------------------------------
        */

        data: {

          type:
            "message",

          conversation_id:
            data.conversation_id
              ? String(data.conversation_id)
              : null,

          message_id:
            data.message_id
              ? String(data.message_id)
              : null,

          sender_id:
            data.sender_id
              ? String(data.sender_id)
              : null,

          sender_name:
            data.sender_name
              ? String(data.sender_name)
              : null,

          body:
            data.body
              ? String(data.body)
              : ""

        },


        /*
        =================================================
        ANDROID NOTIFICATION ACTIONS
        =================================================
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
      ===================================================
      SHOW NOTIFICATION
      ===================================================
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
NOTIFICATION CLICK / ACTION
=========================================================
*/

self.addEventListener(
  "notificationclick",
  event => {

    event.waitUntil(

      (async () => {

        /*
        -------------------------------------------------
        CLOSE NOTIFICATION
        -------------------------------------------------
        */

        try{

          event.notification.close();

        }catch(error){}


        /*
        =================================================
        READ NOTIFICATION DATA
        =================================================
        */

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


        /*
        -------------------------------------------------
        IMPORTANT

        event.action tells us exactly which button was
        pressed.

        Empty action = normal notification tap.
        -------------------------------------------------
        */

        const action =
          event.action
            ? String(event.action)
            : "open";


        console.log(
          "ToTalk notification action:",
          {
            action,
            conversationId,
            messageId
          }
        );


        /*
        =================================================
        BUILD COMPLETE ACTION PAYLOAD
        =================================================

        chat.html expects these fields.
        =================================================
        */

        const actionMessage = {

          type:
            "TOTalk_NOTIFICATION_ACTION",

          action:
            action,

          conversation_id:
            conversationId || null,

          message_id:
            messageId || null,

          body:
            messageBody || "",

          sender_name:
            senderName || ""

        };


        /*
        =================================================
        FIND EXISTING TOTalk WINDOW
        =================================================
        */

        const windowClients =
          await self.clients.matchAll({

            type:
              "window",

            includeUncontrolled:
              true

          });


        /*
        =================================================
        FIRST PRIORITY:
        EXISTING ToTalk WINDOW
        =================================================
        */

        for(
          const client
          of windowClients
        ){

          try{

            const url =
              new URL(client.url);


            /*
            Only communicate with our own site.
            */

            if(
              url.origin !==
              self.location.origin
            ){

              continue;

            }


            /*
            ------------------------------------------------
            Focus the existing ToTalk window.
            ------------------------------------------------
            */

            await client.focus();


            /*
            ------------------------------------------------
            Send COMPLETE action data.

            This is the important fix.
            ------------------------------------------------
            */

            client.postMessage(
              actionMessage
            );


            console.log(
              "ToTalk notification action delivered to open window:",
              actionMessage
            );


            return;

          }catch(error){

            console.warn(
              "ToTalk existing-window action failed:",
              error
            );

          }

        }


        /*
        =================================================
        NO ToTalk WINDOW IS OPEN
        =================================================

        Open chat.html with the action encoded in the URL.
        =================================================
        */

        if(
          self.clients.openWindow
        ){

          /*
          ------------------------------------------------
          Build URL using the service worker scope.

          This is safer than hard-coding the root path.
          ------------------------------------------------
          */

          const chatUrl =
            new URL(
              "chat.html",
              self.registration.scope
            );


          /*
          ------------------------------------------------
          ACTION
          ------------------------------------------------
          */

          chatUrl.searchParams.set(

            "totalk_notification_action",

            action

          );


          /*
          ------------------------------------------------
          CONVERSATION
          ------------------------------------------------
          */

          if(
            conversationId
          ){

            chatUrl.searchParams.set(

              "totalk_notification_conversation",

              conversationId

            );

          }


          /*
          ------------------------------------------------
          MESSAGE ID
          ------------------------------------------------
          */

          if(
            messageId
          ){

            chatUrl.searchParams.set(

              "totalk_notification_message",

              messageId

            );

          }


          /*
          ------------------------------------------------
          MESSAGE BODY
          ------------------------------------------------
          */

          if(
            messageBody
          ){

            chatUrl.searchParams.set(

              "totalk_notification_body",

              messageBody

            );

          }


          /*
          ------------------------------------------------
          SENDER NAME
          ------------------------------------------------
          */

          if(
            senderName
          ){

            chatUrl.searchParams.set(

              "totalk_notification_sender",

              senderName

            );

          }


          console.log(
            "Opening ToTalk for notification action:",
            chatUrl.href
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
