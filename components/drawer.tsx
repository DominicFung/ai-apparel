import { ReactNode } from "react";
import { ChevronLeftIcon } from '@heroicons/react/24/solid'

interface DrawerProps {
  children: ReactNode,
  header: string,
  isOpen: boolean,
  setIsOpen: (b: boolean) => void
}

export default function Drawer(props: DrawerProps){
  return (<main
    className={
      " fixed overflow-hidden z-40 bg-gray-900 bg-opacity-25 inset-0 transform ease-in-out " +
      (props.isOpen
        ? " transition-opacity opacity-100 duration-500 translate-x-0  "
        : " transition-all delay-500 opacity-0 translate-x-full  ")
    }
  >
    <section
      className={
        " w-screen max-w-lg right-0 absolute bg-white h-full shadow-xl delay-400 duration-500 ease-in-out transition-all transform  " +
        (props.isOpen ? " translate-x-0 " : " translate-x-full ")
      }
    >
      <article className="relative w-screen max-w-lg pb-10 flex flex-col space-y-6 overflow-y-scroll h-full">
        <header className="p-4 font-bold text-lg flex flex-row">
          <button className="bg-gray-100 rounded-sm px-3" onClick={() => { props.setIsOpen(false) }}>
            <ChevronLeftIcon className='w-5 h-5 text-gray-500'/>
          </button>
          <p className="pl-3">{props.header}</p>
        </header>
        <div className="px-4 py-1">
          {props.children}
        </div>
      </article>
    </section>
    <section
      className=" w-screen h-full cursor-pointer "
      onClick={() => {
        props.setIsOpen(false);
      }}
    ></section>
  </main>)
}