import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const UnlockPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title={t("pages.unlock.title")} contentStyle={{ padding: 2 }}>
      <div>{t("pages.unlock.placeholder")}</div>
    </BasePage>
  );
};

export default UnlockPage;

