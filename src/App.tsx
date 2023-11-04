import { MDXEditor } from '@mdxeditor/editor/MDXEditor';
import '@mdxeditor/editor/style.css';
import {
  AdmonitionDirectiveDescriptor,
  AdmonitionKind,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  ChangeAdmonitionType,
  ChangeCodeMirrorLanguage,
  CodeToggle,
  ConditionalContents,
  CreateLink,
  DialogButton,
  DiffSourceToggleWrapper,
  EditorInFocus,
  InsertAdmonition,
  InsertCodeBlock,
  InsertFrontmatter,
  InsertSandpack,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  SandpackConfig,
  Separator,
  ShowSandpackInfo,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  directivesPlugin,
  frontmatterPlugin,
  // imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  sandpackPlugin,
  toolbarPlugin
} from '@mdxeditor/editor';
import './App.css';
import { KInsertImage } from './toolbar/KInsertImage';
import { imagePlugin } from './plugins/kImagePlugin';

const defaultSnippetContent = `
export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
    </div>
  );
}
`.trim();

function whenInAdmonition(editorInFocus: EditorInFocus | null) {
  const node = editorInFocus?.rootNode;
  if (!node || node.getType() !== 'directive') {
    return false;
  }

  return ['note', 'tip', 'danger', 'info', 'caution'].includes(
    node.getMdastNode().name as AdmonitionKind
  );
}

const simpleSandpackConfig: SandpackConfig = {
  defaultPreset: 'react',
  presets: [
    {
      label: 'React',
      name: 'react',
      meta: 'live react',
      sandpackTemplate: 'react',
      sandpackTheme: 'light',
      snippetFileName: '/App.js',
      snippetLanguage: 'jsx',
      initialSnippetContent: defaultSnippetContent
    }
  ]
};

async function imageUploadHandler(image: File, name?: string) {
  return await Promise.resolve('https://picsum.photos/200/300');
}

function App() {
  return (
    <>
      <MDXEditor
        markdown='hello world'
        plugins={[
          codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
          sandpackPlugin({ sandpackConfig: simpleSandpackConfig }),
          codeMirrorPlugin({
            codeBlockLanguages: { js: 'JavaScript', css: 'CSS' }
          }),
          listsPlugin(),
          diffSourcePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          // imagePlugin({
          //   imageUploadHandler
          // }),
          imagePlugin({
            imageUploadHandler
          }),
          directivesPlugin({
            directiveDescriptors: [AdmonitionDirectiveDescriptor]
          }),
          frontmatterPlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <ConditionalContents
                  options={[
                    {
                      when: (editor) => editor?.editorType === 'codeblock',
                      contents: () => <ChangeCodeMirrorLanguage />
                    },
                    {
                      when: (editor) => editor?.editorType === 'sandpack',
                      contents: () => <ShowSandpackInfo />
                    },
                    {
                      fallback: () => (
                        <>
                          <UndoRedo />
                          <Separator />
                          <BoldItalicUnderlineToggles />
                          <CodeToggle />
                          <Separator />
                          <ListsToggle />
                          <Separator />
                          <KInsertImage />
                          <Separator />
                          <ConditionalContents
                            options={[
                              {
                                when: whenInAdmonition,
                                contents: () => <ChangeAdmonitionType />
                              },
                              { fallback: () => <BlockTypeSelect /> }
                            ]}
                          />

                          <Separator />
                          <CreateLink />
                          <Separator />

                          <InsertTable />
                          <InsertThematicBreak />

                          <Separator />
                          <InsertCodeBlock />
                          <InsertSandpack />

                          <ConditionalContents
                            options={[
                              {
                                when: (editorInFocus) =>
                                  !whenInAdmonition(editorInFocus),
                                contents: () => (
                                  <>
                                    <Separator />
                                    <InsertAdmonition />
                                  </>
                                )
                              }
                            ]}
                          />

                          <Separator />
                          <InsertFrontmatter />
                        </>
                      )
                    }
                  ]}
                />
              </DiffSourceToggleWrapper>
            )
          })
        ]}
      />
    </>
  );
}

export default App;
