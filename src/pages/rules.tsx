import { BasePage } from "@/components/base";
import { useTranslation } from "react-i18next";

const RulesPage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title="规则" contentStyle={{ padding: 2 }}>
      <div>规则页面（待实现）</div>
    </BasePage>
  );
};

export default RulesPage;

