import { Injectable } from '@nestjs/common';
import { IncomingMessage } from 'http';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

@Injectable()
export class ConversationService {
  async chatCompletionStreaming(
    completionMessage: ChatCompletionMessageParam[],
  ): Promise<IncomingMessage> {
    const completion = await this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: completionMessage,
      // functions: [],
      temperature: 0.9,
      max_tokens: 100,
      stream: true,
    });

    return completion as unknown as IncomingMessage;
  }

  getDescription(
    completionMessage: ChatCompletionMessageParam[],
    descriptions: string,
  ) {
    const prompt = `Choose the best description for the following text:\n"${completionMessage[0].content}"\nOptions:\n1. ${descriptions}\n.Answer with a number: `;

    return this.getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo-0613',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1,
      temperature: 0.9,
    });
  }

  getOpenAI(): OpenAI {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}
