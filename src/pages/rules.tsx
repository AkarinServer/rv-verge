import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const RulesPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title={t("pages.rules.title")} contentStyle={{ padding: 2 }}>
      <div>{t("pages.rules.placeholder")}</div>
    </BasePage>
  );
};

export default RulesPage;

