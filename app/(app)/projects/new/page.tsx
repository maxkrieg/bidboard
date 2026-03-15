import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";

export const metadata = { title: "New Project — BidBoard" };

export default function NewProjectPage() {
  return (
    <div className="max-w-xl mx-auto">
      <Card className="border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-900">
            New Project
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Describe your project so contractors can give accurate bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
