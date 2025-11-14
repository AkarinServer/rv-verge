import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const LogsPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title={t("pages.logs.title")} contentStyle={{ padding: 2 }}>
      <div>{t("pages.logs.placeholder")}</div>
    </BasePage>
  );
};

export default LogsPage;

