import { ScrollArea } from "@/components/ui/scroll-area";

const Paper = ({ children }: { children: React.ReactNode }) => {
    return (
        <ScrollArea className="ml-10 flex-1 p-6">
            {children}
        </ScrollArea>
    );
}

export default Paper