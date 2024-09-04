import { redirect } from 'next/navigation'

export default function Home() {
  // You might want to add a check here to see if the user is authenticated
  // For now, we'll just redirect to the auth page
  redirect('/auth')
}
