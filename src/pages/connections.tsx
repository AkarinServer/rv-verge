import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const ConnectionsPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="连接" contentStyle={{ padding: 2 }}>
      <div>连接页面（待实现）</div>
    </BasePage>
  );
};

export default ConnectionsPage;

