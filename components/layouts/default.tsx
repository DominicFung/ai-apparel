import Footer from '../menu/footer'
import { ReactElement } from 'react'

interface LayoutProps { children: ReactElement }
export default function DefaultLayout({ children }: LayoutProps) {
  return (
    <>
      <main>{children}</main>
      <Footer />
    </>
  )
}