import { DatePicker, DateField, Calendar } from '@heroui/react'
import type { DateValue } from '@internationalized/date'
import { getLocalTimeZone, parseDate } from '@internationalized/date'

interface SimpleDatePickerProps {
  value: number | null
  onChange: (timestamp: number | null) => void
  ariaLabel: string
}

function timestampToDateValue(ts: number): DateValue {
  const d = new Date(ts)
  const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return parseDate(s)
}

export default function SimpleDatePicker({ value, onChange, ariaLabel }: SimpleDatePickerProps) {
  const dateValue = value ? timestampToDateValue(value) : null

  const handleChange = (v: DateValue | null) => {
    if (!v) {
      onChange(null)
      return
    }
    onChange(v.toDate(getLocalTimeZone()).getTime())
  }

  return (
    <DatePicker value={dateValue} onChange={handleChange} className="w-full">
      <DateField.Group>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={ariaLabel}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  )
}
