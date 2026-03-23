"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CollaboratorsTab } from "./CollaboratorsTab";
import { BidsTab } from "./BidsTab";
import { MessagesTab } from "@/components/messages/MessagesTab";
import { ActivityTimeline } from "./ActivityTimeline";
import type { ProjectWithMeta, BidAnalysisRecord, MessageWithAuthor, ActivityLogWithActor } from "@/types";

interface ProjectTabsProps {
  project: ProjectWithMeta;
  isOwner: boolean;
  ownerEmail: string;
  ownerName: string | null;
  initialAnalysis: BidAnalysisRecord | null;
  initialMessages: MessageWithAuthor[];
  initialActivity: ActivityLogWithActor[];
  currentUserId: string;
}

export function ProjectTabs({
  project,
  isOwner,
  ownerEmail,
  ownerName,
  initialAnalysis,
  initialMessages,
  initialActivity,
  currentUserId,
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
          <TabsTrigger
            value="activity"
            className="px-4 py-2.5 text-sm font-medium rounded-none text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Activity
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="bids" className="">
        <BidsTab
          projectId={project.id}
          bids={project.bids}
          initialAnalysis={initialAnalysis}
        />
      </TabsContent>

      <TabsContent value="messages" className="">
        <MessagesTab
          projectId={project.id}
          initialMessages={initialMessages}
          currentUserId={currentUserId}
        />
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

      <TabsContent value="activity" className="">
        <ActivityTimeline
          initialActivity={initialActivity}
          projectId={project.id}
        />
      </TabsContent>
    </Tabs>
  );
}
