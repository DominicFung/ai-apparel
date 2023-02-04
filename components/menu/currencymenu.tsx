import { Fragment, useEffect, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CurrencyDollarIcon } from '@heroicons/react/20/solid'

const currencies = [
  { name: 'USD' },
  { name: 'CAD' }
]

interface CurrencyMenuProps {
  currency: string,
  setCurrency: (currency: string) => void
}

export default function CurrencyMenu(props: CurrencyMenuProps) {
  const [selected, setSelected] = useState(currencies[0])

  useEffect(() => {
    for (const c in currencies) { if (currencies[c].name === props.currency ) setSelected(currencies[c]) }
  }, [props.currency])

  const setCurrency = (value: { name: string }) => {
    props.setCurrency(value.name)
    setSelected(value)
  }

  return (
    <div className="fixed right-14 top-6 xl:right-6 xl:top-8 w-26 mx-5 z-40">
      <Listbox value={selected} onChange={setCurrency}>
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <span className="block truncate text-gray-500">{selected.name}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <CurrencyDollarIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {currencies.map((currency, idx) => (
                <Listbox.Option
                  key={idx}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                      active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                    }`
                  }
                  value={currency}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate text-gray-500 ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {currency.name}
                      </span>
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}
