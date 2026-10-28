import Field from './Field'
import { inputClass } from '../lib/styles'

function AccountSelect({ id, label, accounts, value, onChange }) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        required
        className={inputClass}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export default AccountSelect