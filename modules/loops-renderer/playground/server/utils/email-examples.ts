import { parseLoopsLmx, type LoopsLmxDiagnostic } from "@onderwijsin/loops-core";
import type { EmailExample } from "../../shared/email-example";

// Design reference: a 600px editorial email, navy type on ivory, a blue notebook illustration,
// generous vertical spacing, one primary CTA and a restrained blue callout. These are fictional,
// self-contained examples; component children are local and never fetched from the Loops API.
const showcaseLmx = `
<Style bodyColor="#ffffff" backgroundColor="#eef2f6" bodyXPadding="32" bodyYPadding="32" />
<Component componentId="northstar-header">
  <Paragraph fontSize="13" paddingBottom="8"><Strong textColor="#2563eb">NORTHSTAR</Strong> / THE BUILDER'S LETTER</Paragraph>
</Component>
<H1 fontSize="30" lineHeight="120">Make room for your best work</H1>
<Paragraph fontSize="17" lineHeight="170">Hi {contact.firstName}, a good week starts with a little less noise. This month's letter is about <Strong>clearer decisions</Strong>, <Em>smaller releases</Em> and the small rituals that help a team move forward.</Paragraph>
<Image src="https://images.vialoops.com/cms91k6me0f1v0i2ofhygfa4x/cms91qval0f1g0j2xh67v0uxe.png" dynamicSrc="{contact.notebookUrl}" alt="An open notebook with blue planning cards and a pencil" width="600" borderRadius="12" paddingBottom="8" />
<H2 fontSize="22" paddingTop="24">A calmer rhythm for your team</H2>
<Paragraph fontSize="16" lineHeight="170">We have been replacing <Strike>another Friday status meeting</Strike> with a short written update. The result is more time to think and a record that is actually useful a month later.</Paragraph>
<Quote fontSize="18" lineHeight="160"><Em>Write down the decision, the reason, and what would make you change your mind.</Em><Br />A small habit worth keeping.</Quote>
<Columns widths="50,50" gap="24" paddingTop="12" paddingBottom="12">
  <ColumnItem>
    <H3 fontSize="17">Start with the outcome</H3>
    <Paragraph fontSize="15" lineHeight="170">A clear brief gives everyone a place to start. Share the problem before you share the solution.</Paragraph>
    <Paragraph><Link href="https://example.com/notes/better-briefs"><Text textColor="#2563eb">Read the field guide</Text></Link></Paragraph>
  </ColumnItem>
  <ColumnItem>
    <H3 fontSize="17">Leave a useful trail</H3>
    <Paragraph fontSize="15" lineHeight="170">Capture one decision while it is fresh. Your future teammates will thank you.</Paragraph>
    <Paragraph><Link href="https://example.com/notes/decision-log"><Text textColor="#2563eb">Try the decision log</Text></Link></Paragraph>
  </ColumnItem>
</Columns>
<Section blockColor="#eff6ff" blockBorderRadius="12" paddingTop="20" paddingRight="24" paddingBottom="20" paddingLeft="24">
  <H2 fontSize="20">Your first 15 minutes</H2>
  <OrderedList>
    <ListItem>Create a shared space for your current project.</ListItem>
    <ListItem>Invite one teammate and write down your first decision.</ListItem>
    <ListItem>Choose <Underline>one small thing to ship this week</Underline>.</ListItem>
  </OrderedList>
  <Button href="https://example.com/workspaces/{contact.userId}" bgColor="#2563eb" textColor="#ffffff" borderRadius="8" innerXPadding="20" innerYPadding="12">Open your workspace</Button>
</Section>
<Paragraph><Br /></Paragraph>
<H2 fontSize="22" paddingTop="16">Small improvements, ready today</H2>
<UnorderedList>
  <ListItem><Strong>Quicker search.</Strong> Find a note by its title, author or a phrase you remember.</ListItem>
  <ListItem><Strong>Cleaner exports.</Strong> Keep your headings, links and lists when sharing a project.</ListItem>
  <ListItem><Strong>A better handoff.</Strong> Use <Code>owner</Code> and <Code>nextStep</Code> to make the next action clear.</ListItem>
</UnorderedList>
<Paragraph fontSize="15">If your team likes a little structure, start with this tiny template:</Paragraph>
<CodeBlock blockColor="#f1f5f9" blockBorderRadius="8" paddingTop="16" paddingRight="16" paddingBottom="16" paddingLeft="16">{
  "decision": "Ship a smaller first version",
  "owner": "{contact.firstName}",
  "nextStep": "Share the prototype on Thursday"
}</CodeBlock>
<Section if="{contact.subscribed}" ifOperation="not_empty" paddingTop="16">
  <Paragraph fontSize="15"><Strong>For our subscribers:</Strong> the next live studio session includes a walkthrough of the decision log and time for your questions.</Paragraph>
</Section>
<Divider color="#cbd5e1" borderWidth="1" paddingTop="16" paddingBottom="16" />
<Component componentId="northstar-signoff">
  <Paragraph fontSize="16">See you in the next letter,<Br /><Strong>The Northstar team</Strong></Paragraph>
  <Paragraph fontSize="13"><Text textColor="#64748b">Made for people who care about their craft.</Text></Paragraph>
  <Icons color="#808080" size="20" gap="16">
    <Icon name="github" href="https://github.com/onderwijsin/nuxt-modules" />
    <Icon name="linkedin" href="https://example.com/community" />
    <Icon name="envelope" href="mailto:hello@example.com" />
  </Icons>
</Component>
`;

/**
 * Authors one workshop email with either canonical or slightly varied source colors.
 * @param nearby - Include realistic source-palette drift for the approximation comparison.
 * @returns A complete local LMX document; only color attributes vary between versions.
 */
function workshopLmx(nearby: boolean): string {
  const surface = nearby ? "#eef5ff" : "#eff6ff";
  const panel = nearby ? "#f7f9fc" : "#f8fafc";
  const text = nearby ? "#344256" : "#334155";
  const link = nearby ? "#2664ea" : "#2563eb";
  return `
<Style bodyColor="#ffffff" backgroundColor="#eef2f6" bodyXPadding="32" bodyYPadding="32" />
<Paragraph fontSize="13" paddingBottom="12"><Strong textColor="#2563eb">NORTHSTAR STUDIO</Strong> / LEARN TOGETHER</Paragraph>
<H1 fontSize="28" lineHeight="125"><Text textColor="#0f172a">Good interfaces start with better questions</Text></H1>
<Paragraph fontSize="16" lineHeight="170"><Text textColor="#334155">Hi {contact.firstName}, your place in our next studio workshop is confirmed. Bring a work-in-progress, a curious teammate, or just a problem you would like to see differently.</Text></Paragraph>
<Paragraph fontSize="16" lineHeight="170"><Text textColor="#334155">We will spend two hours turning a fuzzy brief into a focused interface. No polished portfolio required. You will leave with a clearer direction and something concrete to try the next morning.</Text></Paragraph>
<Section blockColor="${surface}" blockBorderRadius="12" blockBorderColor="#dbeafe" blockBorderWidth="1" paddingTop="20" paddingRight="24" paddingBottom="20" paddingLeft="24">
  <Paragraph fontSize="12"><Strong textColor="#2563eb">YOUR NEXT STUDIO SESSION</Strong></Paragraph>
  <H2 fontSize="20"><Text textColor="#0f172a">From rough idea to useful prototype</Text></H2>
  <Paragraph fontSize="16" lineHeight="165"><Text textColor="${text}">26 November · 14:00–16:00 CET<Br />Live online, with a small group and plenty of room for questions.</Text></Paragraph>
  <Button href="https://example.com/studio/join" bgColor="#2563eb" textColor="#ffffff" borderRadius="8" innerXPadding="20" innerYPadding="12">Join the workshop</Button>
</Section>
<Paragraph><Br /></Paragraph>
<H2 fontSize="21"><Text textColor="#0f172a">A little preparation goes a long way</Text></H2>
<Paragraph fontSize="16" lineHeight="170"><Text textColor="#334155">Pick a screen or flow your team is working on. It can be a sketch, a half-finished prototype or a page that has never quite felt right. The useful part is having a real question to explore.</Text></Paragraph>
<UnorderedList>
  <ListItem><Text textColor="#334155">Bring one example and the question behind it.</Text></ListItem>
  <ListItem><Text textColor="#334155">Keep a notebook handy. We will sketch before opening any tools.</Text></ListItem>
  <ListItem><Text textColor="#334155">Leave the last 20 minutes free for feedback from the group.</Text></ListItem>
</UnorderedList>
<Paragraph fontSize="16" lineHeight="170"><Text textColor="#334155">If you would like a head start, </Text><Link href="https://example.com/studio/workbook"><Text textColor="${link}"><Underline>download the workshop workbook</Underline></Text></Link><Text textColor="#334155">. It includes the same exercises we will use together.</Text></Paragraph>
<Section blockColor="${panel}" blockBorderRadius="12" paddingTop="20" paddingRight="24" paddingBottom="20" paddingLeft="24">
  <H3 fontSize="17"><Text textColor="#0f172a">Meet your host</Text></H3>
  <Paragraph fontSize="15" lineHeight="170"><Text textColor="${text}">Mia is a product designer who helps small teams test ideas before they become big projects. Her sessions combine practical exercises with generous, specific feedback.</Text></Paragraph>
  <Paragraph fontSize="15"><Link href="https://example.com/studio/hosts/mia"><Text textColor="${link}">Read Mia's studio notes</Text></Link></Paragraph>
</Section>
<Paragraph><Br /></Paragraph>
<Paragraph fontSize="16" lineHeight="170"><Text textColor="#334155">Cannot make it live? We will send the recording and exercise notes afterwards. If there is a particular question you would like us to cover, </Text><Link href="mailto:studio@example.com"><Text textColor="#2563eb">reply to this invitation</Text></Link><Text textColor="#334155"> and tell us a little about it.</Text></Paragraph>
<Divider color="#cbd5e1" borderWidth="1" paddingTop="16" paddingBottom="16" />
<Paragraph fontSize="15"><Text textColor="#334155">See you at the studio,<Br /><Strong>Mia and the Northstar team</Strong></Text></Paragraph>
<Paragraph fontSize="13"><Text textColor="#64748b">A couple of good hours, and a fresh way to look at your work.</Text></Paragraph>
`;
}

/**
 * Parses local examples strictly so broken fixture markup fails visibly during development.
 * @param lmx - Authored LMX source, never supplied by a request.
 * @returns The validated renderer-neutral AST.
 */
async function parseExample(lmx: string) {
  const diagnostics: LoopsLmxDiagnostic[] = [];
  const ast = await parseLoopsLmx(lmx, {
    emailType: "campaign",
    onDiagnostic: (item) => diagnostics.push(item)
  });
  if (diagnostics.length) throw new Error(diagnostics.map((item) => item.message).join("\n"));
  return ast;
}

/**
 * Builds the component showcase without network calls or credentials.
 * @param notebookUrl - Absolute URL of the playground's bundled illustration.
 * @returns Metadata, variables and the parsed newsletter AST.
 */
export async function getRenderingExample(notebookUrl: string): Promise<EmailExample> {
  return {
    subject: "Make room for your best work",
    preheader: "Small rituals, clearer decisions, and a calmer week for your team.",
    sender: "Northstar Letters <letters@example.com>",
    recipient: "Alex Morgan <alex@example.com>",
    variables: {
      contact: { firstName: "Alex", userId: "alex-demo", subscribed: true, notebookUrl },
      event: {},
      data: {}
    },
    ast: await parseExample(showcaseLmx)
  };
}

/**
 * Builds canonical and near-color versions from the same workshop email source.
 * @returns Two sample ASTs with identical copy and structure but different authored color values.
 */
export async function getWorkshopExamples(): Promise<{
  exact: EmailExample;
  nearby: EmailExample;
}> {
  const metadata = {
    subject: "You're in: the next Northstar studio workshop",
    preheader: "Two hours, a real design question, and a fresh perspective.",
    sender: "Northstar Studio <studio@example.com>",
    recipient: "Alex Morgan <alex@example.com>",
    variables: { contact: { firstName: "Alex" }, event: {}, data: {} }
  };
  return {
    exact: { ...metadata, ast: await parseExample(workshopLmx(false)) },
    nearby: { ...metadata, ast: await parseExample(workshopLmx(true)) }
  };
}
