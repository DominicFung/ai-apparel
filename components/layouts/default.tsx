import Footer from '../menu/footer'
import { ReactElement } from 'react'
import AppBar from '../menu/appbar'

interface LayoutProps { children: ReactElement }
export default function DefaultLayout({ children }: LayoutProps) {
  return (
    <>
      <AppBar />
      <main>{children}</main>
      <Footer />
    </>
  )
}