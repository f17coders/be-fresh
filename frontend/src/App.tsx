import AppRoutes from "./routes/AppRoutes";
import { useEffect } from "react";
// firebase 알림용
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAccessToken, saveFcmTokens, getFcmToken } from "./utils/tokenUtils";
import { sendFcmToken } from "./api/alarm/alarmApi";
import { isAlarmType } from "./types/alarmTypes";
import { useDispatch } from "react-redux";
import { alertOn } from "./store/features/alarmSlice";
import Swal from "sweetalert2";
import {
  experimental_extendTheme as materialExtendTheme,
  Experimental_CssVarsProvider as MaterialCssVarsProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from "@mui/material/styles";
import { CssVarsProvider as JoyCssVarsProvider, extendTheme } from "@mui/joy/styles";
import CssBaseline from "@mui/material/CssBaseline";


const materialTheme = materialExtendTheme({
  typography: {
    fontFamily: 'Pretendard-Regular'
  },
});

const customTheme = extendTheme({
  fontFamily: {
    display: 'Pretendard-Regular',
    body: 'Pretendard-Regular'
  },
});

// fcm 정보
const config = {
  apiKey: import.meta.env.VITE_APP_API_KEY,
  authDomain: import.meta.env.VITE_APP_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_APP_PROJECT_ID,
  storageBucket: import.meta.env.VITE_APP_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_APP_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_APP_ID,
};
// valid key
const vapidKey = import.meta.env.VITE_APP_VAPID_KEY

const App = () => {
  // 서비스 워커 등록
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // 서비스 워커 예외 경로 설정
      if (
        !window.location.pathname.includes("/jenkins/") ||
        !window.location.pathname.includes("/sonar/")
      ) {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log(
              "Service Worker registered with scope:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      } else {
        // /jenkins 경로로 들어왔을 때 등록된 서비스 워커 해제
        navigator.serviceWorker
          .getRegistrations()
          .then(function (registrations) {
            if (!registrations.length) {
              console.log("No serviceWorker registrations found.");
              return;
            }
            for (let registration of registrations) {
              registration.unregister().then(function (boolean) {
                console.log(
                  boolean
                    ? "Successfully unregistered"
                    : "Failed to unregister",
                  "ServiceWorkerRegistration\n" +
                    (registration.installing
                      ? "  .installing.scriptURL = " +
                        registration.installing.scriptURL +
                        "\n"
                      : "") +
                    (registration.waiting
                      ? "  .waiting.scriptURL = " +
                        registration.waiting.scriptURL +
                        "\n"
                      : "") +
                    (registration.active
                      ? "  .active.scriptURL = " +
                        registration.active.scriptURL +
                        "\n"
                      : "") +
                    "  .scope: " +
                    registration.scope +
                    "\n"
                );
              });
            }
          });
      }
    });
  }

  if ("caches" in window) {
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          return caches.delete(key);
        })
      );
    });
  }

  const fcmToken = getFcmToken();
  const userToken = getAccessToken();
  const dispatch = useDispatch();

  // 시작하기
  initializeApp(config);
  const messaging = getMessaging();

  // fcmToken이 없다면 가져오기
  useEffect(() => {
    if (!fcmToken) {
      requestPermission(userToken, messaging);
    }
  }, []);

  // 메세지 받기
  onMessage(messaging, (payload) => {
    if (isAlarmType(payload)) {
      console.log("메세지 도착");
      // 알람 페이지에 있을 때에만 추가해주자
      console.log(payload);
      const Toast = Swal.mixin({
        toast: true,
        position: "top",
        timer: 3000,
        showConfirmButton: false,
      });
      Toast.fire({
        title: payload.notification.title,
      });
      dispatch(alertOn());
      if (window.location.href.includes('main')) {
        window.location.reload()
      }
    } else {
      console.log("메세지 타입을 확인해주세요");
    }
  });
  return (
    <MaterialCssVarsProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>
      <JoyCssVarsProvider theme={customTheme}>
        <CssBaseline enableColorScheme />
        <AppRoutes />
      </JoyCssVarsProvider>
    </MaterialCssVarsProvider>
  );
};

export default App;

function requestPermission(userToken: string | null, messaging: any) {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      console.log("알림권한 설정: true, token을 가져옵니다.");
      getToken(messaging, { vapidKey: vapidKey })
        .then((currentToken) => {
          if (currentToken) {
            saveFcmTokens(currentToken);
            if (userToken) {
              sendFcmToken(currentToken, userToken);
            } else {
              console.log("아직 로그인 하지 않음");
            }
          } else {
            console.log("알림 토큰을 가져오는 데에 실패!");
          }
        })
        .catch((err) => console.log(err));
    } else if (permission === "denied") {
      Swal.fire({
        icon: "warning",
        title: "푸시 알림이 거절되었습니다.",
        text: "알림이 꺼져있다면, 음식 상태에 따른 알림을 받을 수 없습니다.",
      });
    }
  });
}
