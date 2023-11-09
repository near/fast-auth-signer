FROM node as build-deps
WORKDIR /usr/src/app
COPY . ./
RUN yarn
RUN npx webpack build --mode production 
FROM nginx:alpine as production
ENV NODE_ENV production
COPY --from=build-deps /usr/src/app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf 
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]