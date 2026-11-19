import {packetDb,signingConfigured} from "@/lib/docuseal";
import {sendEngagement} from "@/lib/signing-actions";
import {Button} from "@/components/ui/button";

export async function EngagementPacket({profileId,returnId,email}:{profileId:string;returnId:string;email:string}) {
  const db = packetDb();
  const result = db ? await db.from("signing_packets").select("*").eq("return_id",returnId) : null;
  if (result?.error) throw result.error;
  const packets = result?.data ?? [];
  return <section className="grid gap-2 rounded-md border p-4"><h2 className="font-semibold">Engagement signing</h2>
    {packets.map(packet => <div key={packet.id}><p>{packet.recipient} · {packet.status}</p>
      {packet.signer_states.map((person:{email:string;status:string})=><p key={person.email}>{person.email} · {person.status}</p>)}
      {packet.files.map((file:{name:string},i:number)=><a className="block underline" key={i} href={`/files/packets/${packet.id}/${i}`}>{file.name}</a>)}</div>)}
    {!packets.length && (signingConfigured() ? <form action={sendEngagement.bind(null,profileId,returnId)}>
      <Button>Send engagement letter to {email}</Button></form> : <p>Connect the firm’s approved DocuSeal template to send engagement letters.</p>)}
  </section>;
}
