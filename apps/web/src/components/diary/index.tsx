"use client";
import { ReactNode } from "react";
import Cover from "./cover";
import Paper from "./paper";

const DesktopDiary = ({ children }: { children: ReactNode }) => {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Cover>
                <Paper>{children}</Paper>
            </Cover>
        </div>
    );
}

export default DesktopDiary