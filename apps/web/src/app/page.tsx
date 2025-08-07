import React from "react";
import LoginPage from "./login/page";
import DesktopDiary from "@/components/diary";

const HomePage = () => {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <DesktopDiary>
        <LoginPage />
      </DesktopDiary>
    </React.Suspense>
  );
}

export default HomePage;