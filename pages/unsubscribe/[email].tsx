import { NextPageWithLayout } from '../_app'
import DefaultLayout from '../../components/layouts/default'
import { useRouter } from 'next/router'
import { validateEmail } from '../../utils/utils'

const Unsubscribe: NextPageWithLayout = (props) => {
  const router = useRouter()
  const { email } = router.query

  return (
    <div className="pt-32 px-10">
      <p className='p-2'>Thank you!</p>
      { validateEmail(email as string) ? 
        <p className='p-2 text-green-600'> &quot;{email}&quot; has successfully unsubscribed.</p>:
        <p className='p-2 text-red-600'> &quot;{email}&quot; is not a valid email in our system. </p>
      }
    </div>
  )
}

Unsubscribe.getLayout = (children) => {
  return <DefaultLayout>{children}</DefaultLayout>
}

export default Unsubscribe