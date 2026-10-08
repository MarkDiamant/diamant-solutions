export const dynamic='force-dynamic';
export async function GET(){return Response.json({message:'Havdalah admin requires authenticated access'},{status:401});}
