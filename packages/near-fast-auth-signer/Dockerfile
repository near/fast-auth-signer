FROM node as build-deps
WORKDIR /usr/src/app
COPY . ./
WORKDIR /usr/src/app/packages/near-fast-auth-signer
RUN rm -rf node_modules
RUN yarn
RUN npx webpack build --mode production 
FROM nginx:alpine as production
ENV NODE_ENV production
COPY --from=build-deps /usr/src/app/packages/near-fast-auth-signer/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf 
COPY packages/near-fast-auth-signer/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]