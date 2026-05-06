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
import { ProjectPhotosTab } from "./ProjectPhotosTab";
import type { ProjectWithMeta, BidAnalysisRecord, MessageWithAuthor, ActivityLogWithActor, ProjectPhoto } from "@/types";

interface ProjectTabsProps {
  project: ProjectWithMeta;
  isOwner: boolean;
  ownerEmail: string;
  ownerName: string | null;
  initialAnalysis: BidAnalysisRecord | null;
  initialMessages: MessageWithAuthor[];
  initialActivity: ActivityLogWithActor[];
  currentUserId: string;
  photos: ProjectPhoto[];
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
  photos,
}: ProjectTabsProps) {
  return (
    <Tabs defaultValue="bids">
        <TabsList className="inline-flex bg-zinc-100 p-1 rounded-lg h-auto gap-0.5 mb-6">
          <TabsTrigger
            value="bids"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all text-zinc-500 hover:text-zinc-700 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 data-[state=active]:font-semibold"
          >
            Bids
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all text-zinc-500 hover:text-zinc-700 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 data-[state=active]:font-semibold"
          >
            Messages
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all text-zinc-500 hover:text-zinc-700 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 data-[state=active]:font-semibold"
          >
            Photos
          </TabsTrigger>
          <TabsTrigger
            value="collaborators"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all text-zinc-500 hover:text-zinc-700 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 data-[state=active]:font-semibold"
          >
            Collaborators
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-md px-4 py-1.5 text-sm font-medium transition-all text-zinc-500 hover:text-zinc-700 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 data-[state=active]:font-semibold"
          >
            Activity
          </TabsTrigger>
        </TabsList>

      <TabsContent value="bids" className="">
        <BidsTab
          projectId={project.id}
          bids={project.bids}
          initialAnalysis={initialAnalysis}
          isOwner={isOwner}
        />
      </TabsContent>

      <TabsContent value="messages" className="">
        <MessagesTab
          projectId={project.id}
          initialMessages={initialMessages}
          currentUserId={currentUserId}
        />
      </TabsContent>

      <TabsContent value="photos" className="">
        <ProjectPhotosTab
          photos={photos}
          isOwner={isOwner}
          projectId={project.id}
          bannerPhotoId={project.banner_photo_id ?? null}
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
