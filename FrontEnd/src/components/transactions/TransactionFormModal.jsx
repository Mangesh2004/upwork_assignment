import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoComplete, DatePicker, Form, Input, InputNumber, Modal, Segmented } from 'antd';
import dayjs from 'dayjs';

import config from '../../config';
import { API_DATE_FORMAT, CATEGORY_SUGGESTIONS, fromCents, toCents, toDay } from '../../helpers/transactions';

const MAX_AMOUNT = 1000000000;

const toFormValues = entry =>
  entry?._id
    ? {
        type: entry.type,
        amount: fromCents(entry.amount),
        category: entry.category,
        description: entry.description,
        date: toDay(entry.date)
      }
    : { type: 'expense', amount: null, category: '', description: '', date: dayjs() };

const toPayload = values => ({
  type: values.type,
  amount: toCents(values.amount),
  category: values.category.trim(),
  description: values.description?.trim() || '',
  date: values.date.format(API_DATE_FORMAT)
});

/**
 * Add / edit dialog. `entry` is null for a new entry, or the entry being edited.
 * `onSubmit` receives the API payload and must return a promise; the dialog stays open if it rejects.
 */
const TransactionFormModal = ({ open, entry, onCancel, onSubmit }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const type = Form.useWatch('type', form) || 'expense';
  const category = Form.useWatch('category', form) || '';

  useEffect(() => {
    if (open) form.setFieldsValue(toFormValues(entry));
  }, [open, entry]);

  const categoryOptions = useMemo(
    () =>
      CATEGORY_SUGGESTIONS[type]
        .filter(option => option.toLowerCase().includes(category.toLowerCase()))
        .map(value => ({ value })),
    [type, category]
  );

  const handleOk = () =>
    form
      .validateFields()
      .then(values => {
        setSaving(true);
        return onSubmit(toPayload(values)).finally(() => setSaving(false));
      })
      .catch(() => {});

  return (
    <Modal
      title={entry?._id ? t('transactions.edit') : t('transactions.new')}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      afterClose={() => form.resetFields()}
      forceRender
    >
      <Form form={form} layout="vertical" requiredMark={false} className="pt-2" onFinish={handleOk}>
        <Form.Item name="type">
          <Segmented
            block
            options={[
              { label: t('transactions.expense'), value: 'expense' },
              { label: t('transactions.income'), value: 'income' }
            ]}
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="amount"
            label={t('transactions.amount')}
            rules={[
              { required: true, message: t('validation.required') },
              { type: 'number', min: 0.01, max: MAX_AMOUNT, message: t('transactions.invalidAmount') }
            ]}
          >
            <InputNumber
              className="w-full"
              min={0.01}
              max={MAX_AMOUNT}
              precision={2}
              step={1}
              placeholder="0.00"
              addonAfter={config.defaultCurrency}
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="date"
            label={t('transactions.date')}
            rules={[{ required: true, message: t('validation.required') }]}
          >
            <DatePicker className="w-full" format="ll" allowClear={false} />
          </Form.Item>
        </div>

        <Form.Item
          name="category"
          label={t('transactions.category')}
          rules={[
            { required: true, whitespace: true, message: t('validation.required') },
            { max: 64, message: t('transactions.tooLong', { max: 64 }) }
          ]}
        >
          <AutoComplete options={categoryOptions} placeholder={t('transactions.categoryPlaceholder')} />
        </Form.Item>

        <Form.Item name="description" label={t('transactions.description')} className="mb-0">
          <Input.TextArea
            maxLength={256}
            showCount
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder={t('transactions.descriptionPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TransactionFormModal;
