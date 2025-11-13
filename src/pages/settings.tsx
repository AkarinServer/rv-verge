import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="设置" contentStyle={{ padding: 2 }}>
      <div>设置页面（待实现）</div>
    </BasePage>
  );
};

export default SettingsPage;

