import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DatePicker, Empty, Input, Popconfirm, Segmented, Table, Tag, Tooltip, Typography } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';

import Api from '../helpers/core/Api';
import MessageContext from '../helpers/core/MessageContext';
import ContentPanel from '../components/core/layout/ContentPanel';
import SummaryCards from '../components/transactions/SummaryCards';
import TransactionFormModal from '../components/transactions/TransactionFormModal';
import { API_DATE_FORMAT, formatMoney, toDay } from '../helpers/transactions';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const EMPTY_SUMMARY = { income: 0, expense: 0, balance: 0, count: 0 };
const SEARCH_DELAY = 300;

const Transactions = () => {
  const { t } = useTranslation();
  const { loadingMsg, savedMsg, errorMsg } = useContext(MessageContext);

  const [type, setType] = useState('all');
  const [range, setRange] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // undefined: dialog closed, null: new entry, object: entry being edited
  const [editing, setEditing] = useState(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      ...(type !== 'all' && { type }),
      ...(search && { search }),
      ...(range?.[0] && { from: range[0].format(API_DATE_FORMAT) }),
      ...(range?.[1] && { to: range[1].format(API_DATE_FORMAT) })
    }),
    [type, search, range]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      Api.get('/transactions', { params, signal: controller.signal }),
      Api.get('/transactions/summary', { params, signal: controller.signal })
    ])
      .then(([list, totals]) => {
        setEntries(list.data);
        setSummary(totals.data);
      })
      .catch(err => err?.globalHandler?.())
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [params, reloadKey]);

  const reload = () => setReloadKey(key => key + 1);

  const handleSubmit = payload => {
    const key = loadingMsg();
    const request = editing?._id
      ? Api.patch(`/transactions/${editing._id}`, payload)
      : Api.post('/transactions', payload);

    return request
      .then(() => {
        savedMsg(key);
        setEditing(undefined);
        reload();
      })
      .catch(err => {
        errorMsg(key, err);
        throw err;
      });
  };

  const handleDelete = entry => {
    const key = loadingMsg(t('transactions.deleting'));

    return Api.delete(`/transactions/${entry._id}`)
      .then(() => {
        savedMsg(key, t('transactions.deleted'));
        reload();
      })
      .catch(err => errorMsg(key, err));
  };

  const hasFilters = type !== 'all' || Boolean(range) || Boolean(searchInput);

  const resetFilters = () => {
    setType('all');
    setRange(null);
    setSearchInput('');
  };

  const rangePresets = [
    { label: t('transactions.thisMonth'), value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    {
      label: t('transactions.lastMonth'),
      value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')]
    },
    { label: t('transactions.thisYear'), value: [dayjs().startOf('year'), dayjs().endOf('year')] }
  ];

  const columns = [
    {
      title: t('transactions.date'),
      dataIndex: 'date',
      key: 'date',
      width: 140,
      sorter: (a, b) => toDay(a.date).valueOf() - toDay(b.date).valueOf(),
      render: value => toDay(value).format('ll')
    },
    {
      title: t('transactions.type'),
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: value => (
        <Tag color={value === 'income' ? 'success' : 'error'} bordered={false}>
          {t(`transactions.${value}`)}
        </Tag>
      )
    },
    {
      title: t('transactions.category'),
      dataIndex: 'category',
      key: 'category',
      width: 160
    },
    {
      title: t('transactions.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: value => value || <Text type="secondary">—</Text>
    },
    {
      title: t('transactions.amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 150,
      sorter: (a, b) => (a.type === 'income' ? a.amount : -a.amount) - (b.type === 'income' ? b.amount : -b.amount),
      render: (value, entry) => (
        <Text strong type={entry.type === 'income' ? 'success' : 'danger'} className="whitespace-nowrap">
          {entry.type === 'income' ? '+' : '−'} {formatMoney(value)}
        </Text>
      )
    },
    {
      key: 'actions',
      align: 'right',
      width: 100,
      render: (_, entry) => (
        <div className="flex justify-end gap-1">
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              aria-label={t('common.edit')}
              icon={<FontAwesomeIcon icon={faEdit} />}
              onClick={() => setEditing(entry)}
            />
          </Tooltip>
          <Popconfirm
            placement="left"
            title={t('transactions.deleteConfirm')}
            okText={t('common.delete')}
            okButtonProps={{ danger: true }}
            cancelText={t('common.cancel')}
            onConfirm={() => handleDelete(entry)}
          >
            <Button type="text" danger aria-label={t('common.delete')} icon={<FontAwesomeIcon icon={faTrashAlt} />} />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <ContentPanel
      title={t('transactions.title')}
      subtitle={<Text type="secondary">{t('transactions.subtitle')}</Text>}
      titleAction={
        <Button type="primary" icon={<FontAwesomeIcon icon={faPlus} />} onClick={() => setEditing(null)}>
          {t('transactions.add')}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <SummaryCards summary={summary} loading={loading} />

        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { label: t('transactions.all'), value: 'all' },
              { label: t('transactions.incomes'), value: 'income' },
              { label: t('transactions.expenses'), value: 'expense' }
            ]}
          />
          <RangePicker value={range} onChange={setRange} presets={rangePresets} format="ll" allowEmpty={[true, true]} />
          <Input.Search
            className="w-full sm:w-72"
            allowClear
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={t('transactions.searchPlaceholder')}
          />
          {hasFilters && (
            <Button type="link" onClick={resetFilters}>
              {t('transactions.resetFilters')}
            </Button>
          )}
          <Text type="secondary" className="ml-auto text-xs">
            {t('transactions.count', { count: summary.count })}
          </Text>
        </div>

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={entries}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={hasFilters ? t('transactions.noResults') : t('transactions.empty')}
              />
            )
          }}
        />
      </div>

      <TransactionFormModal
        open={editing !== undefined}
        entry={editing}
        onCancel={() => setEditing(undefined)}
        onSubmit={handleSubmit}
      />
    </ContentPanel>
  );
};

export default Transactions;
