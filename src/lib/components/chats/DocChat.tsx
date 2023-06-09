import {
  Box,
  Text,
  FormControl,
  IconButton,
  InputGroup,
  InputRightElement,
  Textarea,
  useColorMode,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { TbSend } from 'react-icons/tb';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';

import { useChatContext } from '../../contexts/ChatContext';
import { ChatClient } from '../../utils/api';
import CTASection from '../samples/CTASection';
import SomeText from '../samples/SomeText';
import { API_KEY, CLIENT_MSG_BG, HAS_PROXY, WS_URL, MAIN_BG, SECONDARY } from '~/lib/config';
import { useAppContext } from '~/lib/contexts/AppContext';

export default function DocChat() {
  const { colorMode } = useColorMode();
  const chatContainerRef: React.RefObject<HTMLDivElement> = useRef(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { setLoading, loading } = useAppContext();
  const {
    temperature,
    systemMessage,
    header,
    loadMessages,
    messages,
    connected,
    setConnected,
    wsUrl,
    setHeader,
    websckt,
    setWebsckt,
    chatModel,
    sourcesEnabled,
    setWsUrl,
    isChecked,
    params,
  } = useChatContext();
  const [question, setQuestion] = useState('');
  const [shouldScroll, setShouldScroll] = useState(true);
  const [sendButtonColor, setSendButtonColor] = useState('gray');
  const newColor = colorMode === 'light' ? '#805AD5' : SECONDARY;
  const messagesRef = useRef(null);

  const handleScroll = () => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const isScrolledToBottom =
        chatContainer.scrollHeight - chatContainer.clientHeight <=
        chatContainer.scrollTop + 1;
      if (isScrolledToBottom) {
        setShouldScroll(true);
      } else {
        setShouldScroll(false);
      }
    }
  };

  // function sendMessage(event: any) {
  //   event.preventDefault();
  //   if (question === '') {
  //     return;
  //   }
  //   websckt.send(
  //     JSON.stringify({
  //       question,
  //       system: systemMessage,
  //       temperature: temperature / 100,
  //       model: chatModel,
  //       sources: sourcesEnabled,
  //     })
  //   );
  //   setQuestion('');
  //   inputRef.current?.focus();
  // }

  const sendMessage = async (event: any) => {
    event.preventDefault();
    if (question === '') {
      return;
    }
    setLoading(true);
    const chatClient = new ChatClient();
    try {
      const res = await chatClient.sendContextChatMessage(API_KEY, {
        channel: params.session,
        question,
        system: systemMessage,
        temperature: temperature / 100,
        model: chatModel,
        sources: isChecked,
        context: {
          faiss: {
            bucket_name: params.bucketName,
            path: params.filePath,
          },
        },
      });
      console.log(res.data);
      setQuestion('');
      inputRef.current?.focus();
    } catch (error: any) {
      console.error(error);
      alert(error.response.data.detail);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (wsUrl) {
      const ws = new WebSocket(wsUrl);
      setWebsckt(ws);
      ws.onopen = (event) => {
          console.log("Connected!");
          setConnected(true);
      };
      ws.onmessage = function (event) {
          loadMessages(event);
      };
  
      return () => {
          ws.close();
      };
  }
  }, [wsUrl]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (shouldScroll && chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, shouldScroll]);

  useEffect(() => {
    if (!question) {
      setSendButtonColor('gray');
    } else {
      setSendButtonColor(newColor);
    }
  }, [question]);

  useEffect(() => {
    if (wsUrl && params.filePath && params.session) {
      setWsUrl(
        HAS_PROXY
        ? `${WS_URL}/ws/proxy?session=${params.session}`
        : `${WS_URL}/ws/v1/chat/vectorstore?api_key=${API_KEY}&bucket=${params.bucketName}&path=${params.filePath}&session=${params.session}`
      );
    }
  }, [params.session, wsUrl])

  useEffect(() => {
    setHeader(connected ? 'What can I help you accomplish?' : '📡 Loading...');
  }, [connected]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Box height="100%" bg="#333">
      <Box className='chat-window'>
        {messages.length > 0 ? (
          <Box
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="main-window"
            flexGrow={1}
          >
            <Box ref={messagesRef}>
              {messages.map((message: any, index: number) => (
                <Box
                  key={index}
                  className={message.className}
                  style={{
                    background:
                      message.className === 'client-message'
                        ? colorMode === 'light'
                          ? '#EAECEF'
                          : CLIENT_MSG_BG
                        : colorMode === 'light'
                        ? 'white'
                        : MAIN_BG,
                    fontSize: '14px',
                    position: 'relative',
                  }}
                >
                  {message.className === 'client-message' ? (
                    <Text variant="h3" fontSize="18px" color={newColor} pt={2}>
                      👨‍💻 You:
                    </Text>
                  ) : (
                    <Text variant="h3" fontSize="18px" color="gray.400" pt={2}>
                      🤖 Assistant:
                    </Text>
                  )}
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      div: ({ node, ...props }) => <div {...props} />,
                      p: ({ node, ...props }) => (
                        <p style={{ padding: '15px' }} {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <table
                          style={{ padding: '15px' }}
                          className="table-with-white-border"
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="margin-left-right" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="margin-left-right" {...props} />
                      ),
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <Box p="10px">
                            <Box bg="black" color="white" mb={-2} p={1.5}>
                              <Text>{match[1]}</Text>
                            </Box>
                            <SyntaxHighlighter
                              children={String(children).replace(/\n$/, '')}
                              language={match[1]}
                              PreTag="section"
                              {...props}
                              style={
                                colorMode === 'light' ? undefined : okaidia
                              }
                            />
                          </Box>
                        ) : (
                          <code
                            className={className}
                            {...props}
                            style={{ color: SECONDARY }}
                          >
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box
            ref={chatContainerRef}
            className="main-window"
            flexGrow={1}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Box>
              <SomeText />
              <CTASection />
            </Box>
          </Box>
        )}
      </Box>
      <Box
        className="chat-input-space"
        bg={useColorModeValue('white-smoke', MAIN_BG)}
        bottom={3.5}
      >
        <Box textAlign="center" height="24px">
          {header}
        </Box>
        <FormControl isRequired>
          <InputGroup>
            <Textarea
              // pr="34px"
              rows={2}
              placeholder="Ask a question..."
              ref={inputRef}
              onChange={(e: any) => setQuestion(e.target.value)}
              value={question || ''}
            />
            <InputRightElement
              position="absolute"
              // right="-7px"
              bottom="0px"
              height="auto"
              zIndex="2"
            >
              <IconButton
                isLoading={!connected}
                isDisabled={!connected}
                fontSize={19}
                color={sendButtonColor}
                variant="unstyled"
                aria-label="Send message"
                icon={<TbSend />}
                type="submit"
                onClick={(e) => sendMessage(e)}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>
      </Box>
    </Box>
  );
}
