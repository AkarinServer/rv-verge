import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const ConnectionsPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title={t("pages.connections.title")} contentStyle={{ padding: 2 }}>
      <div>{t("pages.connections.placeholder")}</div>
    </BasePage>
  );
};

export default ConnectionsPage;

