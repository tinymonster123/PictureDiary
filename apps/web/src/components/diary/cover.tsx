import { Card } from "@/components/ui/card";

const Cover = ({ children }: { children: React.ReactNode }) => {
    return (
        <Card className="relative flex h-[96vh] w-[90vw] max-w-4xl flex-col shadow-2xl">

            <div className="absolute left-0 top-0 h-full w-10 bg-stone-900" />
            {children}
        </Card>
    );
}

export default Cover