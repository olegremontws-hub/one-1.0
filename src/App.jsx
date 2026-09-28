import { useMemo, useRef, useState } from 'react'

const CLIENT_TYPES = [
  {
    id: 'fl',
    title: 'Физическое лицо',
    description: 'Для личного ремонта квартиры, дома или апартаментов',
  },
  {
    id: 'ip',
    title: 'Индивидуальный предприниматель',
    description: 'Для заказов от имени ИП и последующего оформления документов',
  },
  {
    id: 'ul',
    title: 'Юридическое лицо',
    description: 'Для компаний с договором, счетами и закрывающими документами',
  },
]

const PROFILE_FIELDS = {
  fl: [
    ['firstName', 'Имя', 'Иван'],
    ['lastName', 'Фамилия', 'Иванов'],
    ['city', 'Город', 'Москва'],
  ],
  ip: [
    ['ipName', 'ФИО / наименование ИП', 'ИП Иванов Иван Иванович'],
    ['inn', 'ИНН', '12 цифр'],
    ['ogrnip', 'ОГРНИП', '15 цифр'],
    ['city', 'Город', 'Москва'],
  ],
  ul: [
    ['companyName', 'Наименование организации', 'ООО «Компания»'],
    ['inn', 'ИНН', '10 цифр'],
    ['kpp', 'КПП', '9 цифр'],
    ['ogrn', 'ОГРН', '13 цифр'],
    ['contactPerson', 'Контактное лицо', 'Иван Иванов'],
    ['city', 'Город', 'Москва'],
  ],
}

function Header() {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand" href="#" aria-label="Bath Dream">
          <span className="brand__bath">BATH</span>
          <span className="brand__dream">dream</span>
        </a>

        <div className="topbar__meta">
          <button className="city" type="button">
            <span className="city__dot" aria-hidden="true" />
            Москва
          </button>
          <a className="phone" href="tel:88003338837">8 (800) 333-88-37</a>
          <button className="text-button" type="button">Войти</button>
        </div>
      </div>
    </header>
  )
}

function StepMeta({ current, total = 4 }) {
  return (
    <div className="step-meta" aria-label={`Шаг ${current} из ${total}`}>
      <span>Шаг {current} из {total}</span>
      <div className="step-meta__track">
        <span style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}

function Tabs({ value, onChange }) {
  return (
    <div className="tabs" role="tablist" aria-label="Способ регистрации">
      <button
        className={value === 'phone' ? 'tabs__item is-active' : 'tabs__item'}
        onClick={() => onChange('phone')}
        type="button"
        role="tab"
        aria-selected={value === 'phone'}
      >
        Номер телефона
      </button>
      <button
        className={value === 'email' ? 'tabs__item is-active' : 'tabs__item'}
        onClick={() => onChange('email')}
        type="button"
        role="tab"
        aria-selected={value === 'email'}
      >
        Электронная почта
      </button>
    </div>
  )
}

function PrimaryButton({ children, disabled = false, onClick, type = 'button' }) {
  return (
    <button className="button button--primary" disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  )
}

function AuthStep({ method, setMethod, contact, setContact, onNext }) {
  const isPhone = method === 'phone'
  const valid = isPhone
    ? contact.replace(/\D/g, '').length >= 11
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)

  return (
    <>
      <StepMeta current={1} />
      <div className="page-heading">
        <p className="eyebrow">Клиент Bath Dream</p>
        <h1>Создайте аккаунт</h1>
        <p>Сохраните расчёт, создавайте заказы и получайте документы в одном кабинете.</p>
      </div>

      <Tabs value={method} onChange={(next) => { setMethod(next); setContact('') }} />

      <label className="field">
        <span>{isPhone ? 'Номер телефона' : 'Электронная почта'}</span>
        <input
          autoFocus
          inputMode={isPhone ? 'tel' : 'email'}
          placeholder={isPhone ? '+7 999 123-45-67' : 'name@example.ru'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
      </label>

      <PrimaryButton disabled={!valid} onClick={onNext}>
        {isPhone ? 'Получить код' : 'Продолжить'}
      </PrimaryButton>

      <p className="legal">
        Продолжая, вы соглашаетесь с <a href="#">Лицензионным соглашением</a> и
        {' '}<a href="#">Положением о защите персональных данных</a>.
      </p>
    </>
  )
}

function VerifyStep({ contact, method, onBack, onNext }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const setDigit = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 3) refs[index + 1].current?.focus()
  }

  const isComplete = digits.every(Boolean)

  return (
    <>
      <StepMeta current={2} />
      <button className="back-link" type="button" onClick={onBack}>← Назад</button>
      <div className="page-heading">
        <p className="eyebrow">Подтверждение</p>
        <h1>Введите полученный код</h1>
        <p>
          {method === 'phone' ? 'Мы отправили SMS на ' : 'Мы отправили письмо на '}
          <strong>{contact}</strong>
        </p>
      </div>

      <div className="otp" aria-label="Код подтверждения">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={refs[index]}
            value={digit}
            inputMode="numeric"
            maxLength={1}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[index] && index > 0) refs[index - 1].current?.focus()
            }}
            aria-label={`Цифра ${index + 1}`}
          />
        ))}
      </div>

      <div className="inline-row">
        <span className="muted">Не получили код?</span>
        <button className="link-button" type="button">Запросить повторно</button>
      </div>

      <PrimaryButton disabled={!isComplete} onClick={onNext}>Подтвердить</PrimaryButton>
      <p className="hint">Для прототипа подходит любой четырёхзначный код.</p>
    </>
  )
}

function ClientTypeStep({ value, onChange, onBack, onNext }) {
  return (
    <>
      <StepMeta current={3} />
      <button className="back-link" type="button" onClick={onBack}>← Назад</button>
      <div className="page-heading">
        <p className="eyebrow">Тип клиента</p>
        <h1>Как оформить ваши заказы?</h1>
        <p>Выбор определяет реквизиты договора, счетов и закрывающих документов.</p>
      </div>

      <div className="choice-list">
        {CLIENT_TYPES.map((item) => (
          <button
            className={value === item.id ? 'choice-card is-selected' : 'choice-card'}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="choice-card__radio" aria-hidden="true" />
            <span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </div>

      <PrimaryButton disabled={!value} onClick={onNext}>Продолжить</PrimaryButton>
    </>
  )
}

function ProfileStep({ type, contact, method, onBack, onNext }) {
  const initialState = useMemo(
    () => Object.fromEntries((PROFILE_FIELDS[type] || []).map(([key]) => [key, ''])),
    [type],
  )
  const [values, setValues] = useState(initialState)

  const fields = PROFILE_FIELDS[type] || []
  const valid = fields.every(([key]) => String(values[key] || '').trim().length > 0)

  const title = CLIENT_TYPES.find((item) => item.id === type)?.title || 'Клиент'

  return (
    <>
      <StepMeta current={4} />
      <button className="back-link" type="button" onClick={onBack}>← Назад</button>
      <div className="page-heading">
        <p className="eyebrow">{title}</p>
        <h1>Данные клиента</h1>
        <p>Эти сведения будут использоваться в заказах и документах.</p>
      </div>

      <div className="form-grid">
        {fields.map(([key, label, placeholder]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input
              placeholder={placeholder}
              value={values[key] || ''}
              onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.value }))}
            />
          </label>
        ))}

        <label className="field field--readonly">
          <span>{method === 'phone' ? 'Подтверждённый телефон' : 'Подтверждённая почта'}</span>
          <input value={contact} readOnly />
        </label>
      </div>

      <PrimaryButton disabled={!valid} onClick={() => onNext(values)}>Создать аккаунт</PrimaryButton>
    </>
  )
}

function SuccessStep({ clientType, onCreateOrder }) {
  const typeLabel = CLIENT_TYPES.find((item) => item.id === clientType)?.title

  return (
    <div className="success">
      <div className="success__icon" aria-hidden="true">✓</div>
      <p className="eyebrow">Готово</p>
      <h1>Аккаунт создан</h1>
      <p>
        Профиль «{typeLabel}» готов. Теперь можно создать первый заказ и перейти к расчёту ремонта.
      </p>
      <PrimaryButton onClick={onCreateOrder}>Создать заказ</PrimaryButton>
      <button className="secondary-button" type="button">Перейти в личный кабинет</button>
    </div>
  )
}

function OrderStart() {
  return (
    <div className="order-start">
      <p className="eyebrow">Следующий модуль</p>
      <h1>Создать заказ</h1>
      <p>Регистрация завершена. Следующим шагом подключим объект, помещения, геометрию и калькулятор демонтажных работ.</p>
      <div className="order-preview">
        <span>Заказ</span>
        <strong>Новый заказ</strong>
        <small>Статус: черновик</small>
      </div>
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState('phone')
  const [contact, setContact] = useState('')
  const [clientType, setClientType] = useState('')
  const [, setProfile] = useState(null)

  const renderStep = () => {
    if (step === 1) {
      return <AuthStep method={method} setMethod={setMethod} contact={contact} setContact={setContact} onNext={() => setStep(2)} />
    }
    if (step === 2) {
      return <VerifyStep contact={contact} method={method} onBack={() => setStep(1)} onNext={() => setStep(3)} />
    }
    if (step === 3) {
      return <ClientTypeStep value={clientType} onChange={setClientType} onBack={() => setStep(2)} onNext={() => setStep(4)} />
    }
    if (step === 4) {
      return (
        <ProfileStep
          type={clientType}
          contact={contact}
          method={method}
          onBack={() => setStep(3)}
          onNext={(value) => { setProfile(value); setStep(5) }}
        />
      )
    }
    if (step === 5) {
      return <SuccessStep clientType={clientType} onCreateOrder={() => setStep(6)} />
    }
    return <OrderStart />
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <section className="auth-card">{renderStep()}</section>
      </main>
      <footer className="footer">
        <span>© Bath Dream</span>
        <span>Клиентский модуль · прототип</span>
      </footer>
    </div>
  )
}
