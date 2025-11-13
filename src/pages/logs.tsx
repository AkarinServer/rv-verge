import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const LogsPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="日志" contentStyle={{ padding: 2 }}>
      <div>日志页面（待实现）</div>
    </BasePage>
  );
};

export default LogsPage;

