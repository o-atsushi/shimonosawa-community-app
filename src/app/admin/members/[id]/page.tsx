import MemberDetailAdminPage from "@/components/admin/MemberDetailAdminPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetailAdminPage id={id} />;
}
