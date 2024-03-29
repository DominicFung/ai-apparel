import { Fragment, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'

import Link from 'next/link'

interface ItemNotFoundProps {
  open: boolean
  itemId: string
  productId: string
}

export default function ItemNotFound(props: ItemNotFoundProps){
  const cancelButtonRef = useRef(null)

  return (
    <Transition.Root show={props.open} as={Fragment}>
    <Dialog
      as="div" style={{zIndex: 100}}
      auto-reopen="true"
      className="fixed inset-0 overflow-y-auto"
      initialFocus={cancelButtonRef}
      onClose={() => {}}
    >
      <div className="mx-5 flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enterTo="opacity-100 translate-y-0 sm:scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 translate-y-0 sm:scale-100"
          leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 m-5">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-600 mb-5">
                    Incorrect Product or Item
                  </Dialog.Title>

                  <div className="">
                    <h3>One of the following IDs is incorrect</h3>
                    <p className="bg-gray-100 my-5 p-5 rounded-sm">
                      <small style={{ color: "#637381", fontSize: "10px" }}> Product ID: {props.productId}</small><br />
                      <small style={{ color: "#637381", fontSize: "10px" }}> Item ID: {props.itemId}</small><br />
                    </p>

                    <p>for questions, please contact <a href="mailto:hello@aiapparelstore.com">hello@aiapparelstore.com</a></p>

                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Link href={'/'}>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-sm border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  ref={cancelButtonRef}
                >Back to Home</button>
              </Link>
              
            </div>
          </div>
        </Transition.Child>
      </div>
    </Dialog>
  </Transition.Root>
  )

}