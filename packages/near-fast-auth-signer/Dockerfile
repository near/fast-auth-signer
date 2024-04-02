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

# Copy the template file
COPY packages/near-fast-auth-signer/config.js.template /usr/share/nginx/html/config.js.template

# Instead of adding to /docker-entrypoint.d, directly use an entrypoint script
# Create a shell script that will run envsubst and then start nginx
RUN echo "#!/bin/sh" > /entrypoint.sh \
    && echo "envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js" >> /entrypoint.sh \
    && echo "exec nginx -g 'daemon off;'" >> /entrypoint.sh \
    && chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]