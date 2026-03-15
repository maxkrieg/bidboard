"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { CollaboratorsTab } from "./CollaboratorsTab";
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
      <TabsList>
        <TabsTrigger value="bids">Bids</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
      </TabsList>

      <TabsContent value="bids" className="mt-6">
        <p className="text-zinc-500 text-sm">
          Bids will appear here. (Coming in Phase 3)
        </p>
      </TabsContent>

      <TabsContent value="messages" className="mt-6">
        <p className="text-zinc-500 text-sm">
          Messages will appear here. (Coming in Phase 6)
        </p>
      </TabsContent>

      <TabsContent value="collaborators" className="mt-6">
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
