import SettingsTabs from "@/components/admin/SettingsTabs";

export default function EinstellungenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-4">Einstellungen</h1>
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
