/** Export the same task-authored paragraphs shown by the document card; no HTML is evaluated. */
export function documentText(section) {
  const blocks = [`# ${section.title}`, ...(section.summary ? [section.summary] : [])]
  for (const part of section.content) {
    blocks.push(`## ${part.heading}`, ...part.paragraphs)
    if (part.bullets?.length) blocks.push(part.bullets.map(item => `- ${item}`).join('\n'))
  }
  return blocks.join('\n\n') + '\n'
}
