import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'
import MailIcon from '@mui/icons-material/Mail'

const Copyright = () => {
  return (
    <div className="flex flex-col justify-center text-xs">
      <p>{'Copyright © '+new Date().getFullYear()+" "}
        <a href="#" className="text-gray-700 hover:underline">AI Apperal Store</a>
      </p>
      <span className="text-gray-400">Powered by: <a href="#" className="hover:underline">Dom Fung</a></span>
    </div>
  )
}

export default function Footer () {
  return (
    <div className="w-full bg-white grid grid-cols-5 lg:h-screen/5">
      <div className="flex flex-col pt-9 md:col-span-2 col-span-5">
        <div className="w-full p-4 flex justify-center">
          AI Apperal Store
        </div>
        <div className="flex flex-row justify-center">
          <a href="#" className="text-lightsage p-1"><InstagramIcon style={{fontSize: "2rem"}} /></a>
          <a href="#" className="text-lightsage p-1"><FacebookIcon style={{fontSize: "2rem"}} /></a>
          <a href="mailto:info@onechanhs.ca" className="text-lightsage p-1"><MailIcon style={{fontSize: "2rem"}} /></a>
        </div>
      </div>
      <div className="md:col-span-1 col-span-5" />
      <div className="flex flex-col pt-12 md:col-span-1 col-span-5">
        <a href="#" className="hover:underline md:text-left text-center">Products</a>
        <a href="#" className="hover:underline md:text-left text-center">Inspo</a>
      </div>
      <div className="flex flex-col pt-12 md:col-span-1 col-span-5">
        <a href="#" className="hover:underline md:text-left text-center">Order</a>
        <a href="#" className="hover:underline md:text-left text-center">F.A.Q</a>
        <a href="#" className="hover:underline md:text-left text-center">About</a>
      </div>
      <div className="col-span-5 w-full flex justify-center text-gray-500 p-5">
        <Copyright />
      </div>
    </div>)
}

