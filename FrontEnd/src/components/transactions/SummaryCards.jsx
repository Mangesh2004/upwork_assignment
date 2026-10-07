import { Card, Statistic, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowTrendDown, faArrowTrendUp, faWallet } from '@fortawesome/free-solid-svg-icons';

import { formatMoney } from '../../helpers/transactions';

const { useToken } = theme;

const SummaryCard = ({ title, value, icon, color, loading }) => (
  <Card bordered={false} className="shadow-sm">
    <div className="flex items-center gap-4">
      <div
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-xl"
        style={{ color, backgroundColor: `${color}1a` }}
      >
        <FontAwesomeIcon icon={icon} />
      </div>
      <Statistic
        title={title}
        value={value}
        loading={loading}
        formatter={formatMoney}
        valueStyle={{ color, fontWeight: 600 }}
      />
    </div>
  </Card>
);

const SummaryCards = ({ summary, loading }) => {
  const { t } = useTranslation();
  const { token } = useToken();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SummaryCard
        title={t('transactions.totalIncome')}
        value={summary.income}
        icon={faArrowTrendUp}
        color={token.colorSuccess}
        loading={loading}
      />
      <SummaryCard
        title={t('transactions.totalExpense')}
        value={summary.expense}
        icon={faArrowTrendDown}
        color={token.colorError}
        loading={loading}
      />
      <SummaryCard
        title={t('transactions.balance')}
        value={summary.balance}
        icon={faWallet}
        color={summary.balance < 0 ? token.colorError : token.colorPrimary}
        loading={loading}
      />
    </div>
  );
};

export default SummaryCards;
