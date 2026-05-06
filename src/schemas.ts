import { z } from "zod";

const idDescription = "Codemagic 24-character hex identifier";
const codemagicId = z.string().min(1).describe(idDescription);

export const GetApplicationSchema = z.object({
  app_id: codemagicId.describe("Application ID"),
}).strict();

export const AddApplicationSchema = z.object({
  repository_url: z.string().url().describe("SSH or HTTPS URL for cloning the repository"),
  team_id: codemagicId.optional().describe("Optional team ID to add the app directly to a team (must be admin)"),
}).strict();

export const AddApplicationPrivateSchema = z.object({
  repository_url: z.string().url().describe("SSH or HTTPS URL for cloning the repository"),
  ssh_key_data: z.string().min(1).describe("Base64-encoded private key file contents"),
  ssh_key_passphrase: z.string().optional().describe("SSH key passphrase, omit if the key has no passphrase"),
  project_type: z.enum(["flutter-app"]).optional().describe("Set to 'flutter-app' when adding a Flutter application"),
  team_id: codemagicId.optional().describe("Optional team ID to add the app to (must be admin)"),
}).strict();

export const GetArtifactSchema = z.object({
  secure_filename: z.string()
    .min(1)
    .describe("Secure filename of the artifact in the form 'uuid1/uuid2/filename.ext'"),
}).strict();

export const CreatePublicArtifactUrlSchema = z.object({
  secure_filename: z.string()
    .min(1)
    .describe("Secure filename of the artifact in the form 'uuid1/uuid2/filename.ext'"),
  expires_at: z.number()
    .int()
    .positive()
    .describe("URL expiration UNIX timestamp in seconds"),
}).strict();

const EnvironmentSchema = z.object({
  variables: z.record(z.string()).optional().describe("Build-time environment variables"),
  groups: z.array(z.string()).optional().describe("Names of variable groups defined in Codemagic"),
  softwareVersions: z.record(z.string()).optional().describe("Software/runtime versions to use for this build"),
}).strict();

export const StartBuildSchema = z.object({
  app_id: codemagicId.describe("Application identifier"),
  workflow_id: z.string().min(1).describe("Workflow identifier from codemagic.yaml or the UI"),
  branch: z.string().optional().describe("Branch name (provide branch OR tag)"),
  tag: z.string().optional().describe("Tag name (provide branch OR tag)"),
  environment: EnvironmentSchema.optional().describe("Environment variables, variable groups, and software versions"),
  labels: z.array(z.string()).optional().describe("Labels to attach to the build"),
  instance_type: z.string().optional().describe("Instance type, e.g. 'mac_mini_m2'"),
}).strict().refine((v) => Boolean(v.branch || v.tag), {
  message: "Either branch or tag must be provided",
  path: ["branch"],
});

export const GetBuildsSchema = z.object({
  app_id: codemagicId.optional().describe("Filter by application identifier"),
  workflow_id: z.string().optional().describe("Filter by workflow identifier"),
  branch: z.string().optional().describe("Filter by branch name"),
  tag: z.string().optional().describe("Filter by tag name"),
}).strict();

export const BuildIdSchema = z.object({
  build_id: codemagicId.describe("Build identifier"),
}).strict();

export const AppIdSchema = z.object({
  app_id: codemagicId.describe("Application identifier"),
}).strict();

export const AppCacheSchema = z.object({
  app_id: codemagicId.describe("Application identifier"),
  cache_id: codemagicId.describe("Cache identifier to delete"),
}).strict();

export const InviteTeamMemberSchema = z.object({
  team_id: codemagicId.describe("Team identifier"),
  email: z.string().email().describe("Email address of the user to invite"),
  role: z.enum(["owner", "developer"]).describe("'owner' (Admin) or 'developer' (Member)"),
}).strict();

export const DeleteTeamMemberSchema = z.object({
  team_id: codemagicId.describe("Team identifier"),
  user_id: codemagicId.describe("User identifier of the member to remove"),
}).strict();

export const EmptySchema = z.object({}).strict();
