import {packetDb} from "@/lib/docuseal";
import { requireProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const profile = await requireProfile("client");
  const signatures = await getStore().listSignatures(profile.id);
  const returns = await getStore().listReturns(profile.id);
  const db = packetDb();
  const packets = db && returns.length ? await db.from("signing_packets").select("id,return_id,status,files").in("return_id",returns.map(item=>item.id)) : null;
  if (packets?.error) throw packets.error;
  const signed = signatures.find((item) => item.kind === "engagement");

  return (
    <>
      <h1 className="font-serif text-3xl">Engagement letter</h1>
      <Alert>
        <AlertTitle>Engagement signing</AlertTitle>
        <AlertDescription>
          Your preparer selects the engagement letter for your return.
        </AlertDescription>
      </Alert>
      {packets?.data?.map(packet => {
        const item = returns.find(row=>row.id === packet.return_id);
        return <section key={packet.id}><h2>{item?.entity} · {item?.taxYear}</h2><p>{packet.status}</p>
          {packet.files.map((file:{name:string},index:number)=><a key={index} className="block underline" href={`/files/packets/${packet.id}/${index}`}>{file.name}</a>)}</section>;
      })}
      {signed ? (
        <a className="underline" href={`/files/signatures/${signed.id}`}>
          Download signed letter
        </a>
      ) : null}
      <p>Your preparer will send your engagement letter by email for signature.</p>
    </>
  );
}
