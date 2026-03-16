"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CollaboratorsTab } from "./CollaboratorsTab";
import { BidsTab } from "./BidsTab";
import type { ProjectWithMeta } from "@/types";

interface ProjectTabsProps {
  project: ProjectWithMeta;
  isOwner: boolean;
  ownerEmail: string;
  ownerName: string | null;
}

export function ProjectTabs({
  project,
  isOwner,
  ownerEmail,
  ownerName,
}: ProjectTabsProps) {
  return (
    <Tabs defaultValue="bids">
      <div className="border-b border-zinc-200 mb-6">
        <TabsList className="gap-0 p-0 h-auto rounded-none w-full justify-start bg-transparent">
          <TabsTrigger
            value="bids"
            className="px-4 py-2.5 text-sm font-medium rounded-none text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Bids
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="px-4 py-2.5 text-sm font-medium rounded-none text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Messages
          </TabsTrigger>
          <TabsTrigger
            value="collaborators"
            className="px-4 py-2.5 text-sm font-medium rounded-none text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Collaborators
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="bids" className="">
        <BidsTab projectId={project.id} bids={project.bids} />
      </TabsContent>

      <TabsContent value="messages" className="">
        <p className="text-zinc-500 text-sm">
          Messages will appear here. (Coming in Phase 6)
        </p>
      </TabsContent>

      <TabsContent value="collaborators" className="">
        <CollaboratorsTab
          projectId={project.id}
          isOwner={isOwner}
          ownerEmail={ownerEmail}
          ownerName={ownerName}
          collaborators={project.collaborators}
        />
      </TabsContent>
    </Tabs>
  );
}
