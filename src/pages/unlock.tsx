import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const UnlockPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="测试" contentStyle={{ padding: 2 }}>
      <div>测试页面（待实现）</div>
    </BasePage>
  );
};

export default UnlockPage;

