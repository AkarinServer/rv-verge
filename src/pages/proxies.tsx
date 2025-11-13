import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const ProxiesPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="代理" contentStyle={{ padding: 2 }}>
      <div>代理页面（待实现）</div>
    </BasePage>
  );
};

export default ProxiesPage;

